import SwiftUI
import SafariServices

public struct AdTogetherView: View {
    public let adUnitID: String
    
    @State private var ad: AdModel?
    @State private var isLoading = true
    @State private var hasError = false
    @State private var impressionTracked = false
    @State private var isHovering = false
    
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.openURL) var openURL
    
    public init(adUnitID: String) {
        self.adUnitID = adUnitID
    }
    
    public var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if hasError || ad == nil {
                EmptyView()
            } else if let adModel = ad {
                // Main Ad UI Container
                Button(action: {
                    handleAdClick(ad: adModel)
                }) {
                    HStack(spacing: 0) {
                        // Image Section
                        if let imageUrlString = adModel.imageUrl, let imageUrl = URL(string: imageUrlString) {
                            AsyncImage(url: imageUrl) { image in
                                image.resizable()
                                     .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.gray.opacity(0.2)
                            }
                            .frame(width: 80)
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
                .buttonStyle(PlainButtonStyle())
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
        
        AdNetworkService.fetchAd(adUnitId: adUnitID) { result in
            DispatchQueue.main.async {
                self.isLoading = false
                switch result {
                case .success(let fetchedAd):
                    self.ad = fetchedAd
                case .failure(let error):
                    AdTogether.shared.logger.error("Failed to load ad: \(error.localizedDescription)")
                    self.hasError = true
                }
            }
        }
    }
    
    private func handleImpression(ad: AdModel) {
        guard !impressionTracked else { return }
        impressionTracked = true
        AdNetworkService.trackImpression(adId: ad.id, token: ad.token)
    }
    
    private func handleAdClick(ad: AdModel) {
        AdNetworkService.trackClick(adId: ad.id, token: ad.token)
        if let clickStr = ad.clickUrl, let clickUrl = URL(string: clickStr) {
            openURL(clickUrl)
        }
    }
}
