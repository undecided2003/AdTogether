Pod::Spec.new do |spec|
  spec.name         = "AdTogether"
  spec.version      = "0.1.10"
  spec.summary      = "The official AdTogether iOS SDK — reciprocal ad exchange to increase conversions and grow your audience."
  spec.description  = <<-DESC
    AdTogether is an ad exchange platform. "Show an ad, get an ad shown." 
    This SDK allows you to easily engage in reciprocal marketing for your iOS applications by displaying native ads and helping you increase conversions.
  DESC
  spec.homepage     = "https://adtogether.relaxsoftwareapps.com"
  spec.license      = { :type => "MIT", :file => "LICENSE" }
  spec.author       = { "AdTogether" => "info1@relaxsoftwareapps.com" }
  
  spec.platform     = :ios, "15.0"
  spec.swift_version = "5.0"

  spec.source       = { :git => "https://github.com/undecided2003/AdTogether.git", :tag => "#{spec.version}" }
  spec.source_files  = "Sources/AdTogether/**/*.{h,m,swift}"

  # Add dependencies if required in the future
  # spec.dependency "AFNetworking", "~> 3.0"
end
