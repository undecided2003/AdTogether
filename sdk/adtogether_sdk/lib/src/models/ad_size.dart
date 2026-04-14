class AdSize {
  final double width;
  final double height;

  const AdSize({required this.width, required this.height});

  static const AdSize banner = AdSize(width: 320, height: 50);
  static const AdSize largeBanner = AdSize(width: 320, height: 100);
  static const AdSize mediumRectangle = AdSize(width: 300, height: 250);
  static const AdSize fullBanner = AdSize(width: 468, height: 60);
  static const AdSize leaderboard = AdSize(width: 728, height: 90);

  // Custom size allowing it to expand naturally with aspect ratio
  static const AdSize fluid = AdSize(
    width: double.infinity,
    height: double.infinity,
  );
}
