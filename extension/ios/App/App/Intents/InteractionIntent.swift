//
//  InteractionIntent.swift
//  App
//
//  Created by Johannes on 11.06.24.
//

import Foundation

import AppIntents
import SwiftUI
import Intents

@available(iOS 16, *)
struct InteractionIntent: AppIntent  {
    static var openAppWhenRun = true

    @available(iOS 16, *)
    static let title = LocalizedStringResource("minded Interaction File")

    @MainActor
    func perform() async throws -> some IntentResult {
        print("PERFORM")
        let urlMinded  = NSURL(string: "minded://interaction")
        if UIApplication.shared.canOpenURL(urlMinded! as URL) {
            await UIApplication.shared.open(urlMinded! as URL)
        } else {
            print("unable to open url")
        }
        return .result()
    }
}
