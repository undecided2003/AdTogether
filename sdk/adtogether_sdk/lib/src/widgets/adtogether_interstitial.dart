import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../adtogether_core.dart';
import '../models/ad_model.dart';

/// A full-screen interstitial ad dialog.
///
/// Usage:
/// ```dart
/// AdTogetherInterstitial.show(
///   context: context,
///   adUnitId: 'my_interstitial',
///   closeDelay: Duration(seconds: 3),
/// );
/// ```
class AdTogetherInterstitial {
  /// Shows an interstitial ad as a full-screen dialog.
  ///
  /// [closeDelay] controls how long before the close button appears.
  static Future<void> show({
    required BuildContext context,
    required String adUnitId,
    Duration closeDelay = const Duration(seconds: 3),
    VoidCallback? onAdLoaded,
    Function(String)? onAdFailedToLoad,
    VoidCallback? onAdClosed,
  }) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      builder: (dialogContext) => _InterstitialDialog(
        adUnitId: adUnitId,
        closeDelay: closeDelay,
        onAdLoaded: onAdLoaded,
        onAdFailedToLoad: (error) {
          onAdFailedToLoad?.call(error);
          Navigator.of(dialogContext).pop();
        },
      ),
    );
    onAdClosed?.call();
  }
}

class _InterstitialDialog extends StatefulWidget {
  final String adUnitId;
  final Duration closeDelay;
  final VoidCallback? onAdLoaded;
  final Function(String)? onAdFailedToLoad;

  const _InterstitialDialog({
    required this.adUnitId,
    required this.closeDelay,
    this.onAdLoaded,
    this.onAdFailedToLoad,
  });

  @override
  State<_InterstitialDialog> createState() => _InterstitialDialogState();
}

class _InterstitialDialogState extends State<_InterstitialDialog>
    with SingleTickerProviderStateMixin {
  AdModel? _adData;
  bool _isLoading = true;
  bool _hasError = false;
  bool _impressionTracked = false;
  bool _canClose = false;
  int _countdown = 0;

  @override
  void initState() {
    super.initState();
    _countdown = widget.closeDelay.inSeconds;
    _fetchAd();
  }

  Future<void> _fetchAd() async {
    try {
      final ad = await AdTogether.fetchAd(
        widget.adUnitId,
        adType: 'interstitial',
      );
      if (mounted) {
        setState(() {
          _adData = ad;
          _isLoading = false;
        });
        widget.onAdLoaded?.call();
        _startCloseTimer();
        _trackImpression();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
        widget.onAdFailedToLoad?.call(e.toString());
      }
    }
  }

  void _startCloseTimer() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        _countdown--;
      });
      if (_countdown <= 0) {
        setState(() {
          _canClose = true;
        });
        return false;
      }
      return true;
    });
  }

  void _trackImpression() {
    if (_adData != null && !_impressionTracked) {
      _impressionTracked = true;
      AdTogether.trackImpression(_adData!.id, token: _adData!.token);
    }
  }

  Future<void> _onAdClicked() async {
    if (_adData == null) return;
    final clickUrl = _adData!.clickUrl;
    if (clickUrl != null && clickUrl.isNotEmpty) {
      try {
        final uri = Uri.parse(clickUrl);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        await AdTogether.trackClick(_adData!.id, token: _adData!.token);
      } catch (e) {
        debugPrint('AdTogether Error: Could not launch URL - $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1F2937) : Colors.white;
    final textColor = isDark
        ? const Color(0xFFF9FAFB)
        : const Color(0xFF111827);
    final descColor = isDark
        ? const Color(0xFF9CA3AF)
        : const Color(0xFF6B7280);

    final screenSize = MediaQuery.of(context).size;
    final isLandscape = screenSize.width > screenSize.height;

    return DefaultTextStyle(
      style: TextStyle(
        decoration: TextDecoration.none,
        color: textColor,
        fontSize: 14,
      ),
      child: Center(
        child: _isLoading
            ? const CircularProgressIndicator(color: Colors.amber)
            : _hasError || _adData == null
            ? const SizedBox.shrink()
            : AnimatedScale(
                scale: 1.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  width: isLandscape
                      ? screenSize.width * 0.85
                      : screenSize.width * 0.9,
                  constraints: BoxConstraints(
                    maxWidth: isLandscape ? 720 : 480,
                    maxHeight: screenSize.height * 0.9,
                  ),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 40,
                        offset: const Offset(0, 20),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    children: [
                      isLandscape
                          ? _buildLandscapeLayout(textColor, descColor, isDark)
                          : _buildPortraitLayout(textColor, descColor, isDark),

                      // Close / Countdown button
                      Positioned(
                        top: 12,
                        right: 12,
                        child: _canClose
                            ? GestureDetector(
                                onTap: () => Navigator.of(context).pop(),
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: const Icon(
                                    Icons.close,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              )
                            : Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  '$_countdown',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  /// Portrait layout: image on top, content below (scrollable as safety net).
  Widget _buildPortraitLayout(Color textColor, Color descColor, bool isDark) {
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Image
          if (_adData!.imageUrl != null)
            GestureDetector(
              onTap: _onAdClicked,
              child: Container(
                constraints: const BoxConstraints(maxHeight: 280),
                color: isDark
                    ? const Color(0xFF111827)
                    : const Color(0xFFF3F4F6),
                child: Image.network(
                  _adData!.imageUrl!,
                  width: double.infinity,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => Container(
                    height: 180,
                    color: Colors.grey.withValues(alpha: 0.2),
                    child: const Center(
                      child: Icon(
                        Icons.image_not_supported,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // Content
          _buildContentSection(textColor, descColor),
        ],
      ),
    );
  }

  /// Landscape layout: image on left, content on right — fits short screens.
  Widget _buildLandscapeLayout(Color textColor, Color descColor, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Image takes left half
        if (_adData!.imageUrl != null)
          Expanded(
            flex: 5,
            child: GestureDetector(
              onTap: _onAdClicked,
              child: Container(
                color: isDark
                    ? const Color(0xFF111827)
                    : const Color(0xFFF3F4F6),
                child: Image.network(
                  _adData!.imageUrl!,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: Colors.grey.withValues(alpha: 0.2),
                    child: const Center(
                      child: Icon(
                        Icons.image_not_supported,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

        // Content takes right half, scrollable
        Expanded(
          flex: 5,
          child: SingleChildScrollView(
            child: _buildContentSection(textColor, descColor),
          ),
        ),
      ],
    );
  }

  /// Shared content section used by both portrait and landscape layouts.
  Widget _buildContentSection(Color textColor, Color descColor) {
    return GestureDetector(
      onTap: _onAdClicked,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _adData!.title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.amber,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'AD',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _adData!.description,
              style: TextStyle(fontSize: 14, color: descColor, height: 1.5),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 16),

            // CTA Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _onAdClicked,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Learn More →',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                'Powered by AdTogether',
                style: TextStyle(
                  fontSize: 10,
                  color: textColor.withValues(alpha: 0.3),
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
