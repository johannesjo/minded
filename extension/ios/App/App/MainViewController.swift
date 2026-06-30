//
//  MainViewController.swift
//  App
//
//  Created by Johannes on 12.06.24.
//

import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {

    var isInteractionShown = false

    /// Whether the companion sun widget cold-launched us (read once from the app
    /// delegate's launch-options check). Drives the synchronous first-paint open and
    /// the launch-sun morph below; both are no-ops on a normal launch.
    private var launchedFromSunWidget: Bool {
        (UIApplication.shared.delegate as? AppDelegate)?.launchedFromSunWidget ?? false
    }

    // The launch-sun morph overlay (item 3): a still copy of the splash sun held
    // over the loading WebView and cross-faded out once the in-app sun has painted,
    // so the springboard→app handoff is one continuous sun, never a hard cut.
    private var launchSunOverlay: UIImageView?
    private var loadProgressObservation: NSKeyValueObservation?

    // Set when the companion sun widget launched us via `minded://sun` (see
    // AppDelegate). We may receive it before the WebView has a live document
    // (cold start), so we hold it and re-apply on `didBecomeActive` until the
    // hash is set, clearing it only once the JS actually runs.
    private var pendingOpenSun = false
    // Bounded backstop for the retry above: if no live WebView ever accepts the
    // hash we give up after a few beats instead of leaving the flag armed — a
    // stale flag must never pop the overlay on some unrelated later foreground
    // (this app never interrupts unasked).
    private var openSunRetriesLeft = 0

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MindedIOSPlugin())

        // Item 2 — synchronous, no-flash open from the widget. `capacitorDidLoad`
        // runs after the WebView is built but *before* the first load (see
        // CAPBridgeViewController.loadView), so a `.atDocumentStart` user script set
        // here runs before the web bundle evaluates. On a widget cold-launch we use
        // it to put `?sun=open` in the hash up front, so RouteCmp reads it
        // synchronously at mount and the interaction overlay is in the very first
        // render — no dashboard frame flashing past first. (The post-load
        // `handleOpenSun` retry still covers warm re-taps, where the app is already
        // running; the redundant fire on cold start is harmless — RouteCmp guards it.)
        if launchedFromSunWidget,
           let userContentController = webView?.configuration.userContentController {
            let openSun = WKUserScript(
                source: "window.location.hash = '/?sun=open'",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
            userContentController.addUserScript(openSun)
        }
    }

    override func viewDidLoad() {
        print("viewDidLoad")
        super.viewDidLoad()


        NotificationCenter.default.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotification(_:)), name: NSNotification.Name("SWITCH_MODE"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenSun), name: .openSun, object: nil)

        // Item 3 — the launch-sun morph. Only on a widget cold-launch, because only
        // then does the first web paint land on a centred sun (item 2's pause); a
        // normal launch lands on the dashboard with the companion on the bottom bar,
        // where a centre→bottom cross-fade would read as a jump, not a morph.
        if launchedFromSunWidget {
            installLaunchSunMorph()
        }
    }

    // The companion sun widget was tapped. Open the shared interaction overlay by
    // setting the `?sun=open` launch flag the web shell consumes (RouteCmp's
    // `?sun=open` effect) — the same overlay as tapping the in-app dashboard sun.
    @objc func handleOpenSun() {
        pendingOpenSun = true
        openSunRetriesLeft = 3
        applyPendingOpenSun()
    }

    // Set the hash, but only clear the pending flag once the JS actually ran:
    // on a cold start this can fire before the WebView has a document, in which
    // case evaluateJavaScript errors and we retry on the next `didBecomeActive`.
    // If the router hasn't mounted yet the hash is simply the initial location it
    // reads (synchronous open); if it has, the reactive effect picks up the
    // hashchange (warm re-tap). Both land on the same overlay. The retry is
    // bounded so a never-delivered open can't fire the overlay later out of the blue.
    private func applyPendingOpenSun() {
        guard pendingOpenSun else { return }
        guard openSunRetriesLeft > 0 else {
            pendingOpenSun = false
            return
        }
        openSunRetriesLeft -= 1
        webView?.evaluateJavaScript("window.location.hash = '/?sun=open'") { [weak self] (_, error) in
            // On error the flag stays set; the next `didBecomeActive` retries
            // until openSunRetriesLeft is exhausted.
            if error == nil {
                self?.pendingOpenSun = false
            }
        }
    }
    
    @objc func handleNotification(_ notification: Notification) {
        if let mode = notification.userInfo?["mode"] as? String {
            // Handle the URL data here
            print("Received MODE:", mode)
            if mode=="interaction" {
               print("URL contains the string 'interaction'")
                loadInteracation()
            } else {
                loadMain()
            }
        }
    }
    
    @objc func appWillEnterForeground() {
        print("App will enter foreground")
        dispatchJSEvent(evName: "WILL_ENTER_FOREGROUND")
        // A pending widget open is retried in `appDidBecomeActive` (which always
        // follows this beat) — kept to a single hook so one tap can't double-fire.
    }

    @objc func appDidBecomeActive() {
        print("App did become active")
        dispatchJSEvent(evName: "DID_BECOME_ACTIVE")
        applyPendingOpenSun()
    }
    
    @objc func appDidEnterBackground() {
        print("App did become active")
        dispatchJSEvent(evName: "DID_ENTER_BACKGROUND")
    }

    // MARK: - Launch-sun morph (item 3)

    // The springboard→app seam is the one place the sun can't yet morph on its own:
    // tapping the widget hands off to a freshly loading WebView, and iOS would hard-
    // cut the launch splash the instant the web view paints. Keep the sun continuous
    // instead — lay a still copy of the launch splash (the same `Splash` sun) over
    // the loading WebView so the system LaunchScreen is replaced by an identical
    // image (no visible swap), then gently cross-fade it out once the in-app sun has
    // painted underneath: the launch sun *becoming* the in-app sun. RouteCmp rests
    // the interaction sun at screen-centre, where the splash sun already sits.
    private func installLaunchSunMorph() {
        guard launchSunOverlay == nil, isViewLoaded else { return }
        let overlay = UIImageView(image: UIImage(named: "Splash"))
        overlay.contentMode = .scaleAspectFill
        overlay.clipsToBounds = true
        overlay.backgroundColor = .systemBackground // matches LaunchScreen.storyboard
        overlay.frame = view.bounds
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(overlay)
        launchSunOverlay = overlay

        // Reveal the web sun once the page has loaded. Observe the WebView's load
        // progress (KVO doesn't fight Capacitor's navigation delegate) and fade after
        // a short beat so the sun has a frame to paint. A hard cap always clears the
        // overlay so a stalled load can never strand the splash on screen.
        loadProgressObservation = webView?.observe(\.estimatedProgress, options: [.new]) { [weak self] _, change in
            if (change.newValue ?? 0) >= 1.0 {
                DispatchQueue.main.async { self?.fadeOutLaunchSunMorph(delay: 0.15) }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            self?.fadeOutLaunchSunMorph(delay: 0)
        }
    }

    private func fadeOutLaunchSunMorph(delay: TimeInterval) {
        guard let overlay = launchSunOverlay else { return }
        launchSunOverlay = nil           // one-shot: KVO and the cap can both arrive
        loadProgressObservation = nil
        UIView.animate(
            withDuration: 0.5,
            delay: delay,
            options: [.curveEaseInOut],
            animations: { overlay.alpha = 0 },
            completion: { _ in overlay.removeFromSuperview() }
        )
    }

    // Don't forget to remove the observers when the app delegate is deinitialized
    deinit {
       loadProgressObservation = nil
       NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
       NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
       NotificationCenter.default.removeObserver(self, name: NSNotification.Name("SWITCH_MODE"), object: nil)
       NotificationCenter.default.removeObserver(self, name: .openSun, object: nil)
    }
    
    func changeHash(newHash: String) {
        execJs(js: "window.location.hash = '\(newHash)'")
    }

    func dispatchJSEvent(evName:String) {
        execJs(js: "window.dispatchEvent(new Event('\(evName)'))")
    }
    
    func execJs(js: String){
        webView?.evaluateJavaScript(js) { (result, error) in
            if let error = error {
                print("error execJs: \(error.localizedDescription)")
            } else {
                print("execJs: \(js)")
            }
        }
    }
    
    
    func loadInteracation() {
        if(isInteractionShown) {
            return
        }
        isInteractionShown = true
        changeHash(newHash: "interaction")

    }
    
    func loadMain() {
        if(!isInteractionShown) {
            return
        }
        isInteractionShown = false
        changeHash(newHash: "")
    }
}
