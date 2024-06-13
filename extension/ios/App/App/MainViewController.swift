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
    
    override func viewDidLoad() {
        print("viewDidLoad")
        super.viewDidLoad()

        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotification(_:)), name: NSNotification.Name("SWITCH_MODE"), object: nil)
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
    }

    @objc func appDidBecomeActive() {
        print("App did become active")
        dispatchJSEvent(evName: "DID_BECOME_ACTIVE")
    }

    // Don't forget to remove the observers when the app delegate is deinitialized
    deinit {
       NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
       NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
       NotificationCenter.default.removeObserver(self, name: NSNotification.Name("SWITCH_MODE"), object: nil)
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
