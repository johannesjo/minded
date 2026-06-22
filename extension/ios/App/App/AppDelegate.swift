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

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("application1")
        // Override point for customization after application launch.
        return true
    }

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
        if url.scheme == "minded", url.host == "sun" {
            NotificationCenter.default.post(name: .openSun, object: nil)
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
