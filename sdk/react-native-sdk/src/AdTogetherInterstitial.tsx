import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView, useColorScheme, Linking } from 'react-native';
import { AdTogether } from './AdTogether';
import { AdModel } from './types';

export interface AdTogetherInterstitialProps {
  adUnitId: string;
  isOpen: boolean;
  onClose: () => void;
  closeDelay?: number;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
  theme?: 'dark' | 'light' | 'auto';
}

export const AdTogetherInterstitial: React.FC<AdTogetherInterstitialProps> = ({
  adUnitId,
  isOpen,
  onClose,
  closeDelay = 3,
  onAdLoaded,
  onAdFailedToLoad,
  theme = 'auto',
}) => {
  const [adData, setAdData] = useState<AdModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(closeDelay);
  const systemColorScheme = useColorScheme();
  
  const impressionTrackedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);
    setTimeLeft(closeDelay);
    impressionTrackedRef.current = false;

    AdTogether.fetchAd(adUnitId, 'interstitial')
      .then((ad) => {
        if (isMounted) {
          setAdData(ad);
          setIsLoading(false);
          onAdLoaded?.();
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('AdTogether Interstitial Failed:', err);
          setHasError(true);
          setIsLoading(false);
          onAdFailedToLoad?.(err);
          onClose(); // Automatically close on error
        }
      });

    return () => {
      isMounted = false;
    };
  }, [adUnitId, isOpen, closeDelay, onAdLoaded, onAdFailedToLoad, onClose]);

  // Track impression and start timer
  useEffect(() => {
    if (isOpen && adData && !isLoading && !hasError && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      AdTogether.trackImpression(adData.id, adData.token);
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen, adData, isLoading, hasError]);

  const handlePress = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      Linking.openURL(adData.clickUrl).catch(console.error);
    }
  };

  if (!isOpen || isLoading || hasError || !adData) {
    return null;
  }

  const isDarkMode = theme === 'auto' ? systemColorScheme === 'dark' : theme === 'dark';
  const bgColor = isDarkMode ? '#111827' : '#ffffff';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const descColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const buttonBgColor = isDarkMode ? '#374151' : '#F3F4F6';

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
          {timeLeft > 0 ? (
            <View style={[styles.closeButton, { backgroundColor: buttonBgColor }]}>
              <Text style={{ color: descColor, fontWeight: 'bold' }}>{timeLeft}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: buttonBgColor }]}>
              <Text style={{ color: textColor, fontWeight: 'bold', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity activeOpacity={0.9} style={styles.content} onPress={handlePress}>
          <View style={styles.imageWrapper}>
            {adData.imageUrl ? (
              <Image source={{ uri: adData.imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: isDarkMode ? '#1F2937' : '#E5E7EB' }]} />
            )}
          </View>
          
          <View style={styles.textWrapper}>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Advertisement</Text>
            </View>
            <Text style={[styles.title, { color: textColor }]}>{adData.title}</Text>
            <Text style={[styles.description, { color: descColor }]}>{adData.description}</Text>
            
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>Learn More</Text>
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  textWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  adBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  adBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
