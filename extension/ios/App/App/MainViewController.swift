//
//  MainViewController.swift
//  App
//
//  Created by Johannes on 12.06.24.
//

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        print("viewDidLoad")
        super.viewDidLoad()

        NotificationCenter.default.addObserver(self, selector: #selector(handleNotification(_:)), name: NSNotification.Name("OPEN_APP_URL"), object: nil)
    }
    
    @objc func handleNotification(_ notification: Notification) {
        if let url = notification.userInfo?["url"] as? URL {
            // Handle the URL data here
            print("Received URL:", url)
            if url.absoluteString.contains("interaction") {
               print("URL contains the string 'interaction'")
            }
        }
    }
}
