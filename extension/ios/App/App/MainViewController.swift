//
//  MainViewController.swift
//  App
//
//  Created by Johannes on 12.06.24.
//

import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler {

    var isInteractionShown = false

    // The shared `?sun=open` launch flag the web shell consumes (RouteCmp's
    // `?sun=open` effect). Mirrors Android's `MainActivity.OPEN_SUN_HASH` so the cold
    // (user script) and warm (retry) paths can't drift to different literals.
    private static let openSunHash = "/?sun=open"
    // The one-off message the web posts once the interaction sun has actually
    // painted; used to fade the launch overlay on the real first paint.
    private static let sunReadyMessage = "mindedSunReady"

    /// Whether the companion sun widget cold-launched us (read once from the app
    /// delegate's launch-options check). Drives the synchronous first-paint open and
    /// the launch fade below; both are no-ops on a normal launch.
    private var launchedFromSunWidget: Bool {
        (UIApplication.shared.delegate as? AppDelegate)?.launchedFromSunWidget ?? false
    }

    /// The exact (already strictly re-encoded) line the tapped prompt card was
    /// showing on a cold launch, if any — appended to the hash so the interaction
    /// opens on that same NOTICE/ACTION_ADVICE (RouteCmp's `widgetLine`).
    private var launchWidgetLine: String? {
        (UIApplication.shared.delegate as? AppDelegate)?.launchWidgetLine
    }

    /// The warm-path twin of `launchWidgetLine`: the card line carried by the
    /// last `.openSun` notification, applied (and cleared) with `pendingOpenSun`.
    private var pendingWidgetLine: String?

    /// The hash the web shell consumes: the shared `?sun=open` flag, plus the
    /// card's line when the tap carried one. `line` is alphanumerics+`%` only
    /// (see AppDelegate.encodedWidgetLine), so it is safe inside the JS string
    /// literals below — mirrors Android's `MainActivity.launchHash`.
    private static func sunHash(line: String?) -> String {
        line.map { "\(openSunHash)&widgetLine=\($0)" } ?? openSunHash
    }

    // The launch fade (item 3): a still of the brand launch screen held over the
    // loading WebView and softly faded out once the in-app sun has painted, so the
    // launch screen eases into the app instead of hard-cutting to a blank frame.
    private var launchOverlay: UIImageView?

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
        // `handleOpenSun` retry covers warm re-taps, where the app is already running;
        // on a cold launch this user script is what opens the sun.)
        if launchedFromSunWidget,
           let userContentController = webView?.configuration.userContentController {
            // One-shot guard: a WKUserScript runs at the start of *every* main-frame
            // load, so if WKWebView reloads (e.g. after iOS jettisons the web content
            // process under memory pressure) an unguarded script would re-force the
            // pause open on a later return — exactly the "never pop the overlay on
            // some unrelated foreground" rule the retry path protects. The
            // sessionStorage flag survives an in-session reload, so the hash is forced
            // only on the genuine launch.
            let openSun = WKUserScript(
                source: """
                if (!sessionStorage.getItem('mindedSunLaunched')) {
                    sessionStorage.setItem('mindedSunLaunched', '1');
                    window.location.hash = '\(Self.sunHash(line: launchWidgetLine))';
                }
                """,
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
        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenSun(_:)), name: .openSun, object: nil)

        // Item 3 — the launch fade. Only on a widget cold-launch, because only then
        // does the first web paint land on the sun pause (item 2); a normal launch
        // lands on the dashboard, where the system launch screen already suffices.
        if launchedFromSunWidget {
            installLaunchFade()
        }
    }

    // The companion sun widget was tapped. Open the shared interaction overlay by
    // setting the `?sun=open` launch flag the web shell consumes (RouteCmp's
    // `?sun=open` effect) — the same overlay as tapping the in-app dashboard sun.
    // The prompt card's tap carries the exact line it was showing (userInfo,
    // already re-encoded by AppDelegate) so the overlay opens on that same
    // interaction; the wordless faces carry none.
    @objc func handleOpenSun(_ notification: Notification) {
        pendingOpenSun = true
        pendingWidgetLine = notification.userInfo?["line"] as? String
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
            pendingWidgetLine = nil
            return
        }
        openSunRetriesLeft -= 1
        let hash = Self.sunHash(line: pendingWidgetLine)
        webView?.evaluateJavaScript("window.location.hash = '\(hash)'") { [weak self] (_, error) in
            // On error the flag stays set; the next `didBecomeActive` retries
            // until openSunRetriesLeft is exhausted.
            if error == nil {
                self?.pendingOpenSun = false
                self?.pendingWidgetLine = nil
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

    // MARK: - Launch fade (item 3)

    // The springboard→app seam would otherwise hard-cut: tapping the widget hands off
    // to a freshly loading WebView, and iOS removes the launch screen the instant the
    // web view paints — which on a cold start can be a blank frame before the bundle
    // renders. Soften it: lay a still of the brand launch screen (the same `Splash`
    // image) over the loading WebView so the system launch screen is replaced by an
    // identical image (no visible swap), then fade it out once the interaction sun has
    // actually painted underneath. (The overlay is the brand mark, not the sun itself
    // — item 2 already puts the real sun in the first web paint; this just eases the
    // launch screen out instead of cutting to it.)
    private func installLaunchFade() {
        guard launchOverlay == nil, isViewLoaded else { return }
        let overlay = UIImageView(image: UIImage(named: "Splash"))
        overlay.contentMode = .scaleAspectFill
        overlay.clipsToBounds = true
        overlay.backgroundColor = .systemBackground // matches LaunchScreen.storyboard
        overlay.frame = view.bounds
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(overlay)
        launchOverlay = overlay

        // Fade out on the real first paint: the web posts `mindedSunReady` once the
        // interaction sun has mounted (see RouteCmp). That's the accurate signal —
        // page-load progress only says resources finished, not that the sun rendered,
        // so it could reveal a blank frame. A hard cap always clears the overlay so a
        // stalled or silent load can never strand the launch screen on top.
        webView?.configuration.userContentController.add(self, name: Self.sunReadyMessage)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            self?.fadeOutLaunch(delay: 0)
        }
    }

    // The web signalled the sun has painted — ease the launch screen out.
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.sunReadyMessage else { return }
        fadeOutLaunch(delay: 0)
    }

    private func fadeOutLaunch(delay: TimeInterval) {
        // Stop listening either way — also breaks the retain cycle from `add(self)`.
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: Self.sunReadyMessage)
        guard let overlay = launchOverlay else { return }
        launchOverlay = nil           // one-shot: the ready message and the cap can both arrive
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
