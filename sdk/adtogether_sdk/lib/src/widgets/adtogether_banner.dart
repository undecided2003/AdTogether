import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';

import '../adtogether_core.dart';
import '../models/ad_size.dart';
import '../models/ad_model.dart';

class AdTogetherBanner extends StatefulWidget {
  final String adUnitId;
  final AdSize size;
  final VoidCallback? onAdLoaded;
  final Function(String)? onAdFailedToLoad;

  const AdTogetherBanner({
    super.key,
    required this.adUnitId,
    this.size = AdSize.fluid,
    this.onAdLoaded,
    this.onAdFailedToLoad,
  });

  @override
  State<AdTogetherBanner> createState() => _AdTogetherBannerState();
}

class _AdTogetherBannerState extends State<AdTogetherBanner> {
  AdModel? _adData;
  bool _isLoading = true;
  bool _hasError = false;
  bool _impressionTracked = false;

  @override
  void initState() {
    super.initState();
    _fetchAd();
  }

  Future<void> _fetchAd() async {
    try {
      final ad = await AdTogether.fetchAd(widget.adUnitId);
      if (mounted) {
        setState(() {
          _adData = ad;
          _isLoading = false;
        });
        widget.onAdLoaded?.call();
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

  void _onVisibilityChanged(VisibilityInfo info) {
    if (!_impressionTracked && info.visibleFraction >= 0.5 && _adData != null) {
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
    if (_isLoading) {
      return SizedBox(
        width: widget.size.width == double.infinity ? null : widget.size.width,
        height: widget.size.height == double.infinity
            ? null
            : widget.size.height,
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    if (_hasError || _adData == null) {
      return const SizedBox.shrink(); // Hide ad quietly on error
    }

    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDarkMode ? const Color(0xFF1F2937) : Colors.white;
    final borderColor = isDarkMode ? Colors.white10 : Colors.black12;
    final textColor = isDarkMode
        ? const Color(0xFFF9FAFB)
        : const Color(0xFF111827);
    final descColor = isDarkMode
        ? const Color(0xFF9CA3AF)
        : const Color(0xFF6B7280);

    return VisibilityDetector(
      key: Key('adtogether_banner_${widget.adUnitId}_${_adData!.id}'),
      onVisibilityChanged: _onVisibilityChanged,
      child: GestureDetector(
        onTap: _onAdClicked,
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          child: Material(
            type: MaterialType.transparency,
            child: Container(
              width: widget.size.width == double.infinity
                  ? double.infinity
                  : widget.size.width,
              height: widget.size.height == double.infinity
                  ? null
                  : widget.size.height,
              decoration: BoxDecoration(
                color: bgColor,
                border: Border.all(color: borderColor),
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: _buildAdLayout(context, textColor, descColor),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHorizontalLayout(Color textColor, Color descColor) {
    return Row(
      children: [
        if (_adData!.imageUrl != null)
          SizedBox(
            width: widget.size.height,
            height: widget.size.height,
            child: Image.network(
              _adData!.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  const Icon(Icons.image_not_supported, color: Colors.grey),
            ),
          ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 12.0,
              vertical: 4.0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        _adData!.title,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: textColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'AD',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  _adData!.description,
                  style: TextStyle(fontSize: 12, color: descColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Selects the appropriate layout based on ad size and orientation.
  Widget _buildAdLayout(
      BuildContext context, Color textColor, Color descColor) {
    final isFixedHeight = widget.size.height == 50 ||
        widget.size.height == 60 ||
        widget.size.height == 90;

    if (isFixedHeight) {
      return _buildHorizontalLayout(textColor, descColor);
    }

    // For fluid/large sizes, switch to horizontal in landscape
    final screenSize = MediaQuery.of(context).size;
    final isLandscape = screenSize.width > screenSize.height;

    if (isLandscape) {
      return _buildFluidHorizontalLayout(textColor, descColor);
    }

    return _buildFluidVerticalLayout(textColor, descColor);
  }

  Widget _buildFluidVerticalLayout(Color textColor, Color descColor) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Stack(
          children: [
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 250),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: _adData!.imageUrl != null
                    ? Image.network(
                        _adData!.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(
                          Icons.image_not_supported,
                          color: Colors.grey,
                        ),
                      )
                    : Container(color: Colors.grey.withValues(alpha: 0.2)),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'AD',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _adData!.title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: textColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                _adData!.description,
                style: TextStyle(fontSize: 14, color: descColor),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Horizontal layout for fluid banners in landscape mode.
  Widget _buildFluidHorizontalLayout(Color textColor, Color descColor) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_adData!.imageUrl != null)
            Expanded(
              flex: 4,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    _adData!.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => const Icon(
                      Icons.image_not_supported,
                      color: Colors.grey,
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'AD',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            flex: 6,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _adData!.title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: textColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _adData!.description,
                    style: TextStyle(fontSize: 14, color: descColor),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
