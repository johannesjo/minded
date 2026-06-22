//
//  MainViewController.swift
//  App
//
//  Created by Johannes on 12.06.24.
//

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    
    var isInteractionShown = false

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
    }
    
    override func viewDidLoad() {
        print("viewDidLoad")
        super.viewDidLoad()

        
        NotificationCenter.default.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotification(_:)), name: NSNotification.Name("SWITCH_MODE"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenSun), name: .openSun, object: nil)
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
