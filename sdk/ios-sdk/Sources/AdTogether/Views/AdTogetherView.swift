import SwiftUI
import SafariServices

public struct AdTogetherView: View {
    public let adUnitId: String
    public let size: AdSize
    public let showCloseButton: Bool
    
    @State private var ad: AdModel?
    @State private var isLoading = true
    @State private var hasError = false
    @State private var impressionTracked = false
    @State private var isHovering = false
    @State private var isVisible = true
    
    private let onAdLoaded: (() -> Void)?
    private let onAdFailedToLoad: ((Error) -> Void)?
    private let onAdClosed: (() -> Void)?
    
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.openURL) var openURL
    
    public init(
        adUnitId: String = "default", 
        size: AdSize = .fluid,
        showCloseButton: Bool = false,
        onAdLoaded: (() -> Void)? = nil,
        onAdFailedToLoad: ((Error) -> Void)? = nil,
        onAdClosed: (() -> Void)? = nil
    ) {
        self.adUnitId = adUnitId
        self.size = size
        self.showCloseButton = showCloseButton
        self.onAdLoaded = onAdLoaded
        self.onAdFailedToLoad = onAdFailedToLoad
        self.onAdClosed = onAdClosed
    }
    
    public var body: some View {
        Group {
            if !isVisible {
                EmptyView()
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if hasError || ad == nil {
                EmptyView()
            } else if let adModel = ad {
                // Main Ad UI Container
                ZStack(alignment: .topTrailing) {
                    Button(action: {
                        handleAdClick(ad: adModel)
                    }) {
                        if size.isFluid {
                            // Vertical Card Layout for Fluid ads
                            VStack(alignment: .leading, spacing: 0) {
                                // Image Header
                                if let imageUrlString = adModel.imageUrl, let imageUrl = URL(string: imageUrlString) {
                                    ZStack(alignment: .topTrailing) {
                                        AsyncImage(url: imageUrl) { image in
                                            image.resizable()
                                                 .aspectRatio(1.77, contentMode: .fill)
                                        } placeholder: {
                                            Color.gray.opacity(0.2)
                                                 .aspectRatio(1.77, contentMode: .fill)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .clipped()
                                        
                                        // Badge
                                        Text("AD")
                                            .font(.system(size: 10, weight: .bold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.yellow)
                                            .foregroundColor(.black)
                                            .cornerRadius(4)
                                            .padding(8)
                                    }
                                }
                                
                                // Content
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(adModel.title)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(colorScheme == .dark ? .white : .primary)
                                        .lineLimit(1)
                                    
                                    Text(adModel.description)
                                        .font(.system(size: 14))
                                        .foregroundColor(colorScheme == .dark ? .gray : .secondary)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                }
                                .padding(12)
                            }
                        } else {
                            // Standard Horizontal Banner Layout
                            HStack(spacing: 0) {
                                // Image Section
                                if let imageUrlString = adModel.imageUrl, let imageUrl = URL(string: imageUrlString) {
                                    AsyncImage(url: imageUrl) { image in
                                        image.resizable()
                                             .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Color.gray.opacity(0.2)
                                    }
                                    .frame(width: 80, height: 80)
                                    .clipped()
                                }
                                
                                // Text Section
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(alignment: .top) {
                                        Text(adModel.title)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(colorScheme == .dark ? .white : .primary)
                                            .lineLimit(1)
                                        
                                        Spacer()
                                        
                                        Text("AD")
                                            .font(.system(size: 9, weight: .bold))
                                            .padding(.horizontal, 4)
                                            .padding(.vertical, 2)
                                            .background(Color.yellow)
                                            .foregroundColor(.black)
                                            .cornerRadius(4)
                                    }
                                    
                                    Text(adModel.description)
                                        .font(.system(size: 12))
                                        .foregroundColor(colorScheme == .dark ? .gray : .secondary)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Close button overlay
                    if showCloseButton {
                        Button(action: {
                            withAnimation {
                                isVisible = false
                            }
                            onAdClosed?()
                        }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 24, height: 24)
                                .background(Color.black.opacity(0.4))
                                .clipShape(Circle())
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(8)
                    }
                }
                .frame(maxWidth: .infinity)
                .background(colorScheme == .dark ? Color(red: 0.15, green: 0.15, blue: 0.16) : Color.white)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.1), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
                .scaleEffect(isHovering ? 1.02 : 1.0)
                .onHover { hovering in
                    withAnimation(.easeInOut(duration: 0.2)) {
                        self.isHovering = hovering
                    }
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
        
        AdTogether.fetchAd(adUnitId: adUnitId, adType: "banner") { result in
            DispatchQueue.main.async {
                self.isLoading = false
                switch result {
                case .success(let fetchedAd):
                    self.ad = fetchedAd
                    self.onAdLoaded?()
                case .failure(let error):
                    AdTogether.shared.logger.error("Failed to load ad: \(error.localizedDescription)")
                    self.hasError = true
                    self.onAdFailedToLoad?(error)
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
