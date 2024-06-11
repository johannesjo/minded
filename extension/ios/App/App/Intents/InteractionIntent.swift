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
    
    @available(iOS 16, *)
    static let title = LocalizedStringResource("minded Interaction File")

    @MainActor
    func perform() async throws -> some IntentResult {
     
      return .result()
    }
    
    func handle(intent: InteractionIntent, completion: @escaping () -> Void) {
          // Trigger app launch
        if let url = URL(string: "minded://") {
              print(url)
              UIApplication.shared.open(url, options: [:], completionHandler: nil)
          }
      }
 }
