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
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotification(_:)), name: NSNotification.Name("OPEN_APP_URL"), object: nil)
    }
    
    @objc func handleNotification(_ notification: Notification) {
        if let url = notification.userInfo?["url"] as? URL {
            // Handle the URL data here
            print("Received URL:", url)
            if url.absoluteString.contains("interaction") {
               print("URL contains the string 'interaction'")
                loadInteracation()
            }
        }
    }
    
    @objc func appWillEnterForeground() {
        print("App will enter foreground")
        loadMain()
    }

    @objc func appDidBecomeActive() {
        print("App did become active")
        loadMain()
    }

    // Don't forget to remove the observers when the app delegate is deinitialized
    deinit {
        
       NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
       NotificationCenter.default.removeObserver(self, name: UIApplication.willEnterForegroundNotification, object: nil)
       NotificationCenter.default.removeObserver(self, name: NSNotification.Name("OPEN_APP_URL"), object: nil)
    }
    
    func changeHash(newHash: String) {
        let js = "console.log('prev',window.location.hash); window.location.hash = '\(newHash)'"
        webView?.evaluateJavaScript(js) { (result, error) in
            if let error = error {
                print("Error changing hash: \(error.localizedDescription)")
            } else {
                print("Hash changed to \(newHash)")
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
