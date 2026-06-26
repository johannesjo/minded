#!/usr/bin/env ruby
# frozen_string_literal: true

# Wire the MindedWidget WidgetKit extension into App.xcodeproj.
#
# This is the programmatic equivalent of the one manual Xcode step described in
# `MindedWidget/README.md` ("File ▸ New ▸ Target… ▸ Widget Extension"). It exists
# so the widget can be wired in from Linux/CI with the `xcodeproj` gem instead of
# needing a Mac for the initial setup (the path RELEASING.md endorses). The Swift
# sources already live in `MindedWidget/`; this only adds the target that builds
# and embeds them, so TestFlight archives stop shipping the WebView shell *without*
# the companion sun.
#
# Idempotent: re-running once the target exists is a no-op.
#
# Usage:
#   gem install xcodeproj         # one-time (or `bundle add xcodeproj`)
#   ruby extension/ios/App/scripts/add_widget_target.rb
#
# NOTE: authored without a macOS/Xcode build available — like the widget Swift it
# wires in, the first `xcodebuild`/Xcode build is the real verification.

require 'xcodeproj'

WIDGET_NAME = 'MindedWidget'
WIDGET_BUNDLE_ID = 'com.minded.app.widget' # must be the app id (com.minded.app) + a suffix
DEPLOYMENT_TARGET = '16.0'
DEVELOPMENT_TEAM = '363FAFK383'
SOURCE_FILES = %w[MindedWidget.swift CompanionSun.swift].freeze

project_path = File.expand_path(File.join(__dir__, '..', 'App.xcodeproj'))
project = Xcodeproj::Project.open(project_path)

app_target = project.targets.find { |t| t.name == 'App' }
raise 'App target not found in App.xcodeproj' unless app_target

if project.targets.any? { |t| t.name == WIDGET_NAME }
  puts "#{WIDGET_NAME} target already exists — nothing to do."
  exit 0
end

# Mirror the app's version build settings so the widget's Info.plist (which reads
# $(MARKETING_VERSION)/$(CURRENT_PROJECT_VERSION)) resolves and the App Store
# accepts the paired build.
app_release = app_target.build_configurations.find { |c| c.name == 'Release' } ||
              app_target.build_configurations.first
marketing_version = app_release.build_settings['MARKETING_VERSION'] || '1.0'
project_version = app_release.build_settings['CURRENT_PROJECT_VERSION'] || '1'

widget_target = project.new_target(
  :app_extension,
  WIDGET_NAME,
  :ios,
  DEPLOYMENT_TARGET,
)

# Group + file references for the existing sources (relative to SOURCE_ROOT = App/).
widget_group = project.main_group.find_subpath(WIDGET_NAME, true)
widget_group.set_source_tree('SOURCE_ROOT')
widget_group.set_path(WIDGET_NAME)

SOURCE_FILES.each do |file_name|
  ref = widget_group.new_reference(file_name)
  widget_target.add_file_references([ref])
end
widget_group.new_reference('Info.plist') # carried by INFOPLIST_FILE, not compiled

widget_target.build_configurations.each do |config|
  settings = config.build_settings
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = WIDGET_BUNDLE_ID
  settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  settings['INFOPLIST_FILE'] = "#{WIDGET_NAME}/Info.plist"
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
  settings['DEVELOPMENT_TEAM'] = DEVELOPMENT_TEAM
  settings['CODE_SIGN_STYLE'] = 'Automatic'
  settings['SWIFT_VERSION'] = '5.0'
  settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  settings['SKIP_INSTALL'] = 'YES' # required so the extension is embedded, not installed standalone
  settings['MARKETING_VERSION'] = marketing_version
  settings['CURRENT_PROJECT_VERSION'] = project_version
  settings['LD_RUNPATH_SEARCH_PATHS'] = [
    '$(inherited)',
    '@executable_path/Frameworks',
    '@executable_path/../../Frameworks',
  ]
end

# Embed the built .appex into the app and make the app build it first.
app_target.add_dependency(widget_target)

embed_phase = app_target.build_phases.find do |phase|
  phase.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) &&
    phase.symbol_dst_subfolder_spec == :plug_ins
end
embed_phase ||= begin
  phase = app_target.new_copy_files_build_phase('Embed App Extensions')
  phase.symbol_dst_subfolder_spec = :plug_ins
  phase
end

build_file = embed_phase.add_file_reference(widget_target.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save
puts "Added #{WIDGET_NAME} app-extension target and embedded it into App."
puts 'Next: open App.xcworkspace in Xcode (or run the iOS build) to verify it compiles.'
