//
//  MindedIOSPlugin.swift
//  App
//
//  Created by Johannes on 13.06.24.
//

import Foundation
import Capacitor
import WidgetKit

@objc(MindedIOSPlugin)
public class MindedIOSPlugin: CAPPlugin {

  @objc public func continueToApp(_ call: CAPPluginCall) {
      print("MindedIOSPlugin: continueToApp")
      call.resolve()
  }

  /// Whether any minded widget is currently placed on the Home Screen.
  /// The web layer gates its "add the widget" invitation on this observed
  /// state, so the nudge is truthful and retires itself the moment a widget
  /// exists — no counters, no stored flags. A read failure resolves as
  /// installed=true on purpose: "unknown" must never nag.
  @objc public func isWidgetInstalled(_ call: CAPPluginCall) {
      guard #available(iOS 14.0, *) else {
          call.resolve(["isInstalled": true])
          return
      }
      WidgetCenter.shared.getCurrentConfigurations { result in
          switch result {
          case .success(let widgets):
              call.resolve(["isInstalled": !widgets.isEmpty])
          case .failure:
              call.resolve(["isInstalled": true])
          }
      }
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
