//
//  MindedIOSPlugin.m
//  App
//
//  Created by Johannes on 13.06.24.
//

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(MindedIOSPlugin, "MindedIOSPlugin",
   CAP_PLUGIN_METHOD(continueToApp, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(isWidgetInstalled, CAPPluginReturnPromise);
//   CAP_PLUGIN_METHOD(lock, CAPPluginReturnPromise);
//   CAP_PLUGIN_METHOD(unlock, CAPPluginReturnPromise);
)
