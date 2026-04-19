/// Represents the size of an AdTogether banner ad.
class AdSize {
  /// The width of the ad in logical pixels.
  final double width;

  /// The height of the ad in logical pixels.
  final double height;

  /// Creates a new [AdSize] with the given [width] and [height].
  const AdSize({required this.width, required this.height});

  /// Standard phone banner (320x50).
  static const AdSize banner = AdSize(width: 320, height: 50);

  /// Taller phone banner for extra visibility (320x100).
  static const AdSize largeBanner = AdSize(width: 320, height: 100);

  /// Inline content ad (300x250).
  static const AdSize mediumRectangle = AdSize(width: 300, height: 250);

  /// Tablet-width banner (468x60).
  static const AdSize fullBanner = AdSize(width: 468, height: 60);

  /// Tablet/desktop leaderboard (728x90).
  static const AdSize leaderboard = AdSize(width: 728, height: 90);

  /// A responsive size that expands to fill its parent's width.
  static const AdSize fluid = AdSize(
    width: double.infinity,
    height: double.infinity,
  );
}
