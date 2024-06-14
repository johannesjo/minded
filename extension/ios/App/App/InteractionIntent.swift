//
//  InteractionIntent.swift
//  
//
//  Created by Johannes on 13.06.24.
//

import Foundation
import AppIntents
import UIKit

enum ResultValue {
    case success
    case failure(Error)
}

@available(iOS 16.4, *)
struct InteractionIntent: ForegroundContinuableIntent {
    
    static var title: LocalizedStringResource = "Opens the app conditionally"

    @MainActor
      func perform() async throws -> some IntentResult {
          try await requestToContinueInForeground("How about a minded interaction rather than this app?") { () async throws -> ResultValue in
              NotificationCenter.default.post(name: Notification.Name("SWITCH_MODE"), object: nil, userInfo: ["mode": "interaction"])
              print("before success")
              return .success // Return appropriate ResultValue after the action#
          }

          print("AAAFTER")
          return .result()
      }
}


// throw needsToContinueInForegroundError("How about a surprise interaction rather than this app?")

 //at this point you can decide whether the app should be brought to the foreground or not

/* // Stop performing the app intent and ask the user to continue to open the app in the foreground
 throw needsToContinueInForegroundError()

 // You can customize the dialog and/or provide a closure to do something in your app after it's opened
 throw needsToContinueInForegroundError("Please continue to open the app.") {
     UIApplication.shared.open(URL(string: "yourapp://deeplinktocontent")!)
 }
*/
 // Or you could ask the user to continue performing the intent in the foreground - if they cancel the intent stops, if they continue the intent execution resumes with the app open
 // This API also accepts an optional dialog and continuation closure

/*
 
 
 import Foundation
 import AppIntents
@available(iOS 16.0, macOS 13.0, watchOS 9.0, tvOS 16.0, *)
struct InteractionIntent: AppIntent, CustomIntentMigratedAppIntent {
    static let intentClassName = "InteractionIntentIntent"

    static var title: LocalizedStringResource = "minded Interaction FF"
    static var description = IntentDescription("Opens the minded interaction")

    static var openAppWhenRun = true
    
    func perform() async throws -> some IntentResult {
        // TODO: Place your refactored intent handler code here.
        return .result()
    }
}*/
