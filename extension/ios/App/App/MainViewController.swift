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
    // (cold start), so we hold it and (re)apply on each lifecycle beat until the
    // hash is set successfully, clearing it only once the JS actually runs.
    private var pendingOpenSun = false

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
        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenSun), name: NSNotification.Name("OPEN_SUN"), object: nil)
    }

    // The companion sun widget was tapped. Open the shared interaction overlay by
    // setting the `?sun=open` launch flag the web shell consumes (RouteCmp's
    // `?sun=open` effect) — the same overlay as tapping the in-app dashboard sun.
    @objc func handleOpenSun() {
        pendingOpenSun = true
        applyPendingOpenSun()
    }

    // Set the hash, but only clear the pending flag once the JS actually ran:
    // on a cold start this can fire before the WebView has a document, in which
    // case evaluateJavaScript errors and we retry on the next lifecycle beat
    // (foreground / active). If the router hasn't mounted yet the hash is simply
    // the initial location it reads (synchronous open); if it has, the reactive
    // effect picks up the hashchange (warm re-tap). Both land on the same overlay.
    private func applyPendingOpenSun() {
        guard pendingOpenSun else { return }
        let js = "window.location.hash = '/?sun=open'"
        webView?.evaluateJavaScript(js) { [weak self] (_, error) in
            if error == nil {
                self?.pendingOpenSun = false
                print("execJs: \(js)")
            } else {
                print("openSun deferred: \(error?.localizedDescription ?? "no webview yet")")
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
        applyPendingOpenSun()
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
       NotificationCenter.default.removeObserver(self, name: NSNotification.Name("OPEN_SUN"), object: nil)
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
