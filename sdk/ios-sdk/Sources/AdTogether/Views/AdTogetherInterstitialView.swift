import SwiftUI

/// A full-screen interstitial ad view.
///
/// Usage:
/// ```swift
/// .fullScreenCover(isPresented: $showInterstitial) {
///     AdTogetherInterstitialView(adUnitId: "my_interstitial") {
///         showInterstitial = false
///     }
/// }
/// ```
public struct AdTogetherInterstitialView: View {
    public let adUnitId: String
    public let closeDelay: Int
    public let onDismiss: () -> Void
    public let onAdLoaded: (() -> Void)?
    public let onAdFailedToLoad: ((Error) -> Void)?
    
    @State private var ad: AdModel?
    @State private var isLoading = true
    @State private var hasError = false
    @State private var impressionTracked = false
    @State private var canClose = false
    @State private var countdown: Int
    
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.openURL) var openURL
    @Environment(\.verticalSizeClass) var verticalSizeClass
    
    private var isLandscape: Bool {
        return verticalSizeClass == .compact
    }
    
    public init(
        adUnitId: String = "default", 
        closeDelay: Int = 3, 
        onAdLoaded: (() -> Void)? = nil, 
        onAdFailedToLoad: ((Error) -> Void)? = nil,
        onDismiss: @escaping () -> Void
    ) {
        self.adUnitId = adUnitId
        self.closeDelay = closeDelay
        self.onDismiss = onDismiss
        self.onAdLoaded = onAdLoaded
        self.onAdFailedToLoad = onAdFailedToLoad
        self._countdown = State(initialValue: closeDelay)
    }
    
    public var body: some View {
        ZStack {
            // Background overlay
            Color.black.opacity(0.85)
                .ignoresSafeArea()
            
            if isLoading {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            } else if hasError || ad == nil {
                EmptyView()
            } else if let adModel = ad {
                // Card Container
                Group {
                    if isLandscape {
                        HStack(spacing: 0) {
                            // Image Section
                            if let imageUrlString = adModel.imageUrl, let imageUrl = URL(string: imageUrlString) {
                                AsyncImage(url: imageUrl) { image in
                                    image.resizable()
                                         .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Color.gray.opacity(0.2)
                                }
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .clipped()
                                .onTapGesture { handleAdClick(ad: adModel) }
                            }
                            
                            // Content Section
                            ScrollView(.vertical, showsIndicators: false) {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack(alignment: .top) {
                                        Text(adModel.title)
                                            .font(.system(size: 18, weight: .bold))
                                            .foregroundColor(colorScheme == .dark ? .white : .primary)
                                            .lineLimit(1)
                                        
                                        Spacer()
                                        
                                        Text("AD")
                                            .font(.system(size: 10, weight: .bold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 3)
                                            .background(Color.yellow)
                                            .foregroundColor(.black)
                                            .cornerRadius(4)
                                    }
                                    
                                    Text(adModel.description)
                                        .font(.system(size: 14))
                                        .foregroundColor(colorScheme == .dark ? .gray : .secondary)
                                        .lineLimit(3)
                                        .multilineTextAlignment(.leading)
                                    
                                    // CTA Button
                                    Button(action: { handleAdClick(ad: adModel) }) {
                                        Text("Learn More →")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.black)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 14)
                                            .background(Color.yellow)
                                            .cornerRadius(12)
                                    }
                                    .padding(.top, 8)
                                    
                                    Text("Powered by AdTogether")
                                        .font(.system(size: 10))
                                        .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.3) : Color.black.opacity(0.3))
                                        .frame(maxWidth: .infinity, alignment: .center)
                                        .padding(.top, 8)
                                }
                                .padding(20)
                            }
                            .frame(maxWidth: .infinity)
                            .onTapGesture { handleAdClick(ad: adModel) }
                        }
                        .frame(maxWidth: 720, maxHeight: 320)
                    } else {
                        VStack(spacing: 0) {
                            // Image
                            if let imageUrlString = adModel.imageUrl, let imageUrl = URL(string: imageUrlString) {
                                AsyncImage(url: imageUrl) { image in
                                    image.resizable()
                                         .aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    Color.gray.opacity(0.2)
                                        .frame(height: 200)
                                }
                                .frame(maxHeight: 280)
                                .frame(maxWidth: .infinity)
                                .background(colorScheme == .dark ? Color(red: 0.07, green: 0.09, blue: 0.14) : Color(red: 0.95, green: 0.96, blue: 0.96))
                                .clipped()
                                .onTapGesture { handleAdClick(ad: adModel) }
                            }
                            
                            // Content
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(alignment: .top) {
                                    Text(adModel.title)
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(colorScheme == .dark ? .white : .primary)
                                        .lineLimit(1)
                                    
                                    Spacer()
                                    
                                    Text("AD")
                                        .font(.system(size: 10, weight: .bold))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 3)
                                        .background(Color.yellow)
                                        .foregroundColor(.black)
                                        .cornerRadius(4)
                                }
                                
                                Text(adModel.description)
                                    .font(.system(size: 14))
                                    .foregroundColor(colorScheme == .dark ? .gray : .secondary)
                                    .lineLimit(3)
                                    .multilineTextAlignment(.leading)
                                
                                // CTA Button
                                Button(action: { handleAdClick(ad: adModel) }) {
                                    Text("Learn More →")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.black)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color.yellow)
                                        .cornerRadius(12)
                                }
                                .padding(.top, 8)
                                
                                Text("Powered by AdTogether")
                                    .font(.system(size: 10))
                                    .foregroundColor(colorScheme == .dark ? Color.white.opacity(0.3) : Color.black.opacity(0.3))
                                    .frame(maxWidth: .infinity, alignment: .center)
                                    .padding(.top, 8)
                            }
                            .padding(20)
                            .onTapGesture { handleAdClick(ad: adModel) }
                        }
                        .frame(maxWidth: 480)
                    }
                }
                .background(colorScheme == .dark ? Color(red: 0.12, green: 0.16, blue: 0.22) : Color.white)
                .cornerRadius(20)
                .shadow(color: Color.black.opacity(0.4), radius: 40, x: 0, y: 20)
                .padding(.horizontal, 20)
                .overlay(alignment: .topTrailing) {
                    // Close / Countdown
                    Group {
                        if canClose {
                            Button(action: onDismiss) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 36, height: 36)
                                    .background(Color.black.opacity(0.6))
                                    .clipShape(Circle())
                            }
                        } else {
                            Text("\(countdown)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.black.opacity(0.6))
                                .clipShape(Circle())
                        }
                    }
                    .padding(12)
                    .padding(.trailing, 20)
                }
                .onAppear {
                    handleImpression(ad: adModel)
                }
            }
        }
        .onAppear {
            if isLoading {
                loadAd()
            }
        }
    }
    
    private func loadAd() {
        guard AdTogether.shared.assertInitialized() else {
            self.hasError = true
            self.isLoading = false
            return
        }
        
        AdTogether.fetchAd(adUnitId: adUnitId, adType: "interstitial") { result in
            DispatchQueue.main.async {
                self.isLoading = false
                switch result {
                case .success(let fetchedAd):
                    self.ad = fetchedAd
                    self.onAdLoaded?()
                    startCountdown()
                case .failure(let error):
                    AdTogether.shared.logger.error("Failed to load interstitial: \(error.localizedDescription)")
                    self.hasError = true
                    self.onAdFailedToLoad?(error)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        onDismiss()
                    }
                }
            }
        }
    }
    
    private func startCountdown() {
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { timer in
            DispatchQueue.main.async {
                self.countdown -= 1
                if self.countdown <= 0 {
                    self.canClose = true
                    timer.invalidate()
                }
            }
        }
    }
    
    private func handleImpression(ad: AdModel) {
        guard !impressionTracked else { return }
        impressionTracked = true
        AdTogether.trackImpression(adId: ad.id, token: ad.token)
    }
    
    private func handleAdClick(ad: AdModel) {
        AdTogether.trackClick(adId: ad.id, token: ad.token)
        if let clickStr = ad.clickUrl, let clickUrl = URL(string: clickStr) {
            openURL(clickUrl)
        }
    }
}
