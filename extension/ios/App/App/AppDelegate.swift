import UIKit
import Capacitor

extension Notification.Name {
    /// Posted when the home-screen companion sun widget opens `minded://sun`.
    /// Observed by MainViewController, which sets the shared `?sun=open` flag.
    static let openSun = Notification.Name("OPEN_SUN")
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// True when the app was *cold-launched* by tapping the companion sun widget
    /// (`minded://sun` arrived in the launch options). MainViewController reads this
    /// to seed the WebView's very first paint straight into the sun pause - and to
    /// bridge the launch with a morphing sun instead of a hard splash cut - rather
    /// than relying on the post-load hash retry (which paints a dashboard frame
    /// first). A warm re-tap, where the app is already running, goes through
    /// `application(open:)` → `.openSun` below instead.
    var launchedFromSunWidget = false

    /// The exact line the tapped prompt card was showing (`minded://sun?line=…`),
    /// already strictly re-encoded (see `encodedWidgetLine`) and held for the
    /// cold-launch path so the very first paint opens on that same interaction.
    /// nil for the wordless faces (small sun, the night card).
    var launchWidgetLine: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("application1")
        // Note a widget cold-launch before the WebView loads, so the controller can
        // open the sun synchronously in the first render. We only flag it here; the
        // shared `?sun=open` handling is unchanged. If this is ever missed, the
        // `application(open:)` retry path still opens the overlay (just a frame late).
        if let url = launchOptions?[.url] as? URL, url.scheme == "minded", url.host == "sun" {
            launchedFromSunWidget = true
            launchWidgetLine = Self.encodedWidgetLine(from: url)
        }
        return true
    }

    /// The `line` the tapped prompt card was showing, re-encoded so that only
    /// ASCII alphanumerics and `%` can ever reach the WebView hash. This is
    /// sanitize-then-degrade, not Android's exact-pool allow-list
    /// (`widgetLineFromIntent`): `minded://` is open to any app and the hash is
    /// set via a JS string literal, so a crafted URL must never be able to break
    /// out of it - the strict output alphabet guarantees that. The exact-pool
    /// match stays on the web side (`matchWidgetLine`), where an unrecognised
    /// line just falls through to the normal random pick - it degrades, never
    /// breaks. (The pool itself compiles only into the widget target; compiling
    /// WidgetPrompts.swift into the App target too would restore exact Android
    /// parity if that ever matters.)
    static func encodedWidgetLine(from url: URL) -> String? {
        guard
            let line = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "line" })?.value,
            !line.isEmpty,
            // Real widget lines are ≤70 chars of ASCII (see the pool + the jest
            // mirror test, which pins this 70 to the Kotlin cap); counting bytes
            // keeps the bound honest for multi-scalar graphemes too.
            line.utf8.count <= 70
        else { return nil }
        return line.addingPercentEncoding(withAllowedCharacters: Self.asciiAlphanumerics)
    }

    // Deliberately NOT `CharacterSet.alphanumerics`, which is Unicode-wide
    // (every script's letters, digits, and combining marks would pass through
    // unencoded). Real pool lines are pure ASCII, so nothing legitimate is lost,
    // and the encoder's output alphabet is byte-exactly what the comments claim.
    private static let asciiAlphanumerics = CharacterSet(
        charactersIn: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    )

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
        NotificationCenter.default.post(name: Notification.Name("SWITCH_MODE"), object: nil,  userInfo: ["mode": "main"])
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
        print("applicationWillEnterForeground")
        //   NotificationCenter.default.post(name: Notification.Name("SWITCH_MODE"), object: nil,  userInfo: ["mode": "main"])
 }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        print("applicationDidBecomeActive")
  }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }
    

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        print("application URL" , url)
        // The home-screen companion sun widget opens `minded://sun`. Turn it into
        // the shared `?sun=open` launch flag the web shell already consumes (the
        // exact same trigger as tapping the in-app dashboard sun). The notification
        // is observed by MainViewController, which sets the WebView hash. We handle
        // it here rather than passing it to Capacitor so a missing @capacitor/app
        // listener can't swallow it. See docs/sun-companion-widget.md.
        // The prompt card also carries the exact line it was showing (`?line=…`);
        // it rides along (re-encoded, see `encodedWidgetLine`) so the interaction
        // opens on that same NOTICE/ACTION_ADVICE.
        if url.scheme == "minded", url.host == "sun" {
            var userInfo: [AnyHashable: Any] = [:]
            if let line = Self.encodedWidgetLine(from: url) {
                userInfo["line"] = line
            }
            NotificationCenter.default.post(name: .openSun, object: nil, userInfo: userInfo)
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        print("application2")
        print("application2", userActivity.activityType)

        NotificationCenter.default.post(name: Notification.Name("SWITCH_MODE"), object: nil,  userInfo: ["mode": "interaction"])
        return true
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        // return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
