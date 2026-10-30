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

    // The shared `?sun=open` launch flag the web shell consumes (RouteCmp's
    // `?sun=open` effect). Mirrors Android's `MainActivity.OPEN_SUN_HASH` so the cold
    // (user script) and warm (retry) paths can't drift to different literals.
    private static let openSunHash = "/?sun=open"
    // The one-off message the web posts once its first surface (and the sun on
    // it) has actually painted; used to fade the launch overlay on the real
    // first paint (MainIOS).
    private static let sunReadyMessage = "mindedSunReady"
    // The launch sky (Assets.xcassets/LaunchSky): the same image
    // LaunchScreen.storyboard shows, so the overlay replaces the system launch
    // screen with no visible swap.
    private static let launchSkyImage = "LaunchSky"

    /// Whether the companion sun widget cold-launched us (read once from the app
    /// delegate's launch-options check). Drives the synchronous first-paint open
    /// below; a no-op on a normal launch.
    private var launchedFromSunWidget: Bool {
        (UIApplication.shared.delegate as? AppDelegate)?.launchedFromSunWidget ?? false
    }

    /// The exact (already strictly re-encoded) line the tapped prompt card was
    /// showing on a cold launch, if any - appended to the hash so the interaction
    /// opens on that same NOTICE/ACTION_ADVICE (RouteCmp's `widgetLine`).
    private var launchWidgetLine: String? {
        (UIApplication.shared.delegate as? AppDelegate)?.launchWidgetLine
    }

    /// The warm-path twin of `launchWidgetLine`: the card line carried by the
    /// last `.openSun` notification, applied (and cleared) with `pendingOpenSun`.
    private var pendingWidgetLine: String?

    /// The hash the web shell consumes: the shared `?sun=open` flag, plus the
    /// card's line when the tap carried one. `line` is ASCII alphanumerics+`%`
    /// only (see AppDelegate.encodedWidgetLine), so it is safe inside the JS
    /// string literals below - mirrors Android's `MainActivity.launchHash`.
    private static func sunHash(line: String?) -> String {
        line.map { "\(openSunHash)&widgetLine=\($0)" } ?? openSunHash
    }

    // The launch fade: the launch sky held over the loading WebView and softly
    // faded out once the app's first surface has painted, so the launch screen
    // eases into the app instead of hard-cutting to a blank frame.
    private var launchOverlay: UIImageView?

    // Set when the companion sun widget launched us via `minded://sun` (see
    // AppDelegate). We may receive it before the WebView has a live document
    // (cold start), so we hold it and re-apply on `didBecomeActive` until the
    // hash is set, clearing it only once the JS actually runs.
    private var pendingOpenSun = false
    // Bounded backstop for the retry above: if no live WebView ever accepts the
    // hash we give up after a few beats instead of leaving the flag armed - a
    // stale flag must never pop the overlay on some unrelated later foreground
    // (this app never interrupts unasked).
    private var openSunRetriesLeft = 0

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MindedIOSPlugin())
        // The sun's touch (sunAnimationUtils' triggerHaptic / triggerSoftTick).
        // Registered before the first load, so it's there for the first drag.
        webView?.configuration.userContentController.add(
            SunHaptics(), name: SunHaptics.messageName
        )

        // Item 2 - synchronous, no-flash open from the widget. `capacitorDidLoad`
        // runs after the WebView is built but *before* the first load (see
        // CAPBridgeViewController.loadView), so a `.atDocumentStart` user script set
        // here runs before the web bundle evaluates. On a widget cold-launch we use
        // it to put `?sun=open` in the hash up front, so RouteCmp reads it
        // synchronously at mount and the interaction overlay is in the very first
        // render - no dashboard frame flashing past first. (The post-load
        // `handleOpenSun` retry covers warm re-taps, where the app is already running;
        // on a cold launch this user script is what opens the sun.)
        if launchedFromSunWidget,
           let userContentController = webView?.configuration.userContentController {
            // One-shot guard: a WKUserScript runs at the start of *every* main-frame
            // load, so if WKWebView reloads (e.g. after iOS jettisons the web content
            // process under memory pressure) an unguarded script would re-force the
            // pause open on a later return - exactly the "never pop the overlay on
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
        super.viewDidLoad()

        NotificationCenter.default.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenSun(_:)), name: .openSun, object: nil)

        // The launch fade, on every cold launch (this view loads once per
        // process): whether the first paint is the dashboard, onboarding, or the
        // pause a widget tap opened, it eases in under the launch sky rather
        // than cutting from the launch screen to a WebView still loading.
        installLaunchFade()
    }

    // The companion sun widget was tapped. Open the shared interaction overlay by
    // setting the `?sun=open` launch flag the web shell consumes (RouteCmp's
    // `?sun=open` effect) - the same overlay as tapping the in-app dashboard sun.
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

    @objc func appWillEnterForeground() {
        dispatchJSEvent(evName: "WILL_ENTER_FOREGROUND")
        // A pending widget open is retried in `appDidBecomeActive` (which always
        // follows this beat) - kept to a single hook so one tap can't double-fire.
    }

    @objc func appDidBecomeActive() {
        dispatchJSEvent(evName: "DID_BECOME_ACTIVE")
        applyPendingOpenSun()
    }

    @objc func appDidEnterBackground() {
        dispatchJSEvent(evName: "DID_ENTER_BACKGROUND")
    }

    // MARK: - Launch fade

    // The springboard→app seam would otherwise hard-cut: iOS removes the launch
    // screen the instant the web view paints - which on a cold start is a blank
    // frame before the bundle renders. Soften it: lay the launch sky (the same
    // `LaunchSky` image LaunchScreen.storyboard shows, stretched the same way) over
    // the loading WebView, so the system launch screen is replaced by an identical
    // image (no visible swap), then fade it out once the app has actually painted
    // underneath. The launch sky carries no disc of its own: the only sun is the
    // app's, easing in where it lives - never a logo or a second sun in its place.
    private func installLaunchFade() {
        guard launchOverlay == nil, isViewLoaded else { return }
        let overlay = UIImageView(image: UIImage(named: Self.launchSkyImage))
        // Stretched, not aspect-filled: the sky's stops must span the screen's
        // height the way the web's gradient does, not crop to its middle.
        overlay.contentMode = .scaleToFill
        overlay.frame = view.bounds
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(overlay)
        launchOverlay = overlay

        // Fade out on the real first paint: the web posts `mindedSunReady` once its
        // first surface has painted (see MainIOS). That's the accurate signal -
        // page-load progress only says resources finished, not that the sun rendered,
        // so it could reveal a blank frame. A hard cap always clears the overlay so a
        // stalled or silent load can never strand the launch screen on top.
        webView?.configuration.userContentController.add(self, name: Self.sunReadyMessage)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            self?.fadeOutLaunch(delay: 0)
        }
    }

    // The web signalled the sun has painted - ease the launch screen out.
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.sunReadyMessage else { return }
        fadeOutLaunch(delay: 0)
    }

    private func fadeOutLaunch(delay: TimeInterval) {
        // Stop listening either way - also breaks the retain cycle from `add(self)`.
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

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    func dispatchJSEvent(evName:String) {
        execJs(js: "window.dispatchEvent(new Event('\(evName)'))")
    }

    func execJs(js: String){
        webView?.evaluateJavaScript(js) { (_, error) in
            if let error = error {
                print("error execJs: \(error.localizedDescription)")
            }
        }
    }
}

/// The sun's touch on iPhone. WebKit has no `navigator.vibrate`, so without a
/// native hand the in-app sun was mute to touch here. The web posts the same
/// semantic names Android's `Haptics` takes (sunAnimationUtils'
/// `triggerHaptic`: light / medium / heavy) plus `tick`, the faintest one, as
/// the finger catches the sun (`triggerSoftTick`). UIKit's feedback generators
/// follow the system haptics switch on their own, as Android's tick follows
/// its touch-feedback setting.
///
/// A handler of its own rather than the view controller: the content
/// controller holds its handlers strongly, and this one stays for the life of
/// the WebView.
final class SunHaptics: NSObject, WKScriptMessageHandler {
    static let messageName = "mindedHaptic"

    private let tick = UISelectionFeedbackGenerator()
    private let impacts: [String: UIImpactFeedbackGenerator] = [
        "light": UIImpactFeedbackGenerator(style: .light),
        "medium": UIImpactFeedbackGenerator(style: .medium),
        "heavy": UIImpactFeedbackGenerator(style: .heavy),
    ]

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let type = message.body as? String else { return }
        if type == "tick" {
            tick.selectionChanged()
            // The sun was just caught: wake the engine for the drag's threshold
            // clicks, so the first lands on its threshold rather than a beat late.
            impacts.values.forEach { $0.prepare() }
        } else if let impact = impacts[type] {
            impact.impactOccurred()
        }
    }
}
