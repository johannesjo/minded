//
//  MindedIOSPlugin.swift
//  App
//
//  Created by Johannes on 13.06.24.
//

import Foundation
import Capacitor

@objc(MindedIOSPlugin)
public class MindedIOSPlugin: CAPPlugin {

  @objc public func continueToApp(_ call: CAPPluginCall) {
      print("MindedIOSPlugin: continueToApp")
      call.resolve()
  }


    
    /*
    override public func load() {
     NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.orientationDidChange),
        name: UIDevice.orientationDidChangeNotification,
        object: nil)
    }

    deinit {
      NotificationCenter.default.removeObserver(self)
    }

    @objc private func orientationDidChange() {
      // Ignore changes in orientation if unknown, face up, or face down
      if(UIDevice.current.orientation.isValidInterfaceOrientation) {
        let orientation = implementation.getCurrentOrientationType()
        notifyListeners("screenOrientationChange", data: ["type": orientation])
      }
    }*/
}
