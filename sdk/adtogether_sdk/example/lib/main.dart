import 'package:flutter/material.dart';
import 'package:adtogether_sdk/adtogether_sdk.dart';

void main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize the SDK with your App API Key from the dashboard
  // Use a sample key for demonstration
  await AdTogether.initialize(appId: 'at_f57425e89a9545eda1162baeedb78636');

  runApp(const AdTogetherExampleApp());
}

class AdTogetherExampleApp extends StatelessWidget {
  const AdTogetherExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AdTogether Example',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.amber),
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.amber,
          brightness: Brightness.dark,
        ),
        brightness: Brightness.dark,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  void _showInterstitial() {
    // 2. Simply show an interstitial ad
    AdTogetherInterstitial.show(
      context: context,
      adUnitId: 'example_interstitial_123',
      onAdLoaded: () => ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Interstitial Loaded!'))),
      onAdFailedToLoad: (error) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Ad Error: $error'))),
      onAdClosed: () => debugPrint('User returned to app!'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AdTogether SDK Hub'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const HeroHeader(),
              const SizedBox(height: 32),

              // 3. Banner Ad (Standard size)
              const Section(title: 'Standard Banner (320x50)'),
              const AdTogetherBanner(
                adUnitId: 'home_banner_top',
                size: AdSize.banner,
              ),

              const SizedBox(height: 32),

              // 4. Large Banner
              const Section(title: 'Large Banner (320x100)'),
              const AdTogetherBanner(
                adUnitId: 'home_banner_large',
                size: AdSize.largeBanner,
              ),

              const SizedBox(height: 32),

              // 5. Interstitial Button
              ElevatedButton.icon(
                onPressed: _showInterstitial,
                icon: const Icon(Icons.fullscreen),
                label: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16.0),
                  child: Text(
                    'Show Interstitial Ad (Earn 5 Credits)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),

              const SizedBox(height: 48),

              // 6. Fluid layout (Vertical)
              const Section(title: 'Fluid Vertical Layout'),
              const AdTogetherBanner(
                adUnitId: 'home_feed_fluid',
                size: AdSize.fluid,
              ),

              const SizedBox(height: 100), // Extra space to scroll
            ],
          ),
        ),
      ),
    );
  }
}

class HeroHeader extends StatelessWidget {
  const HeroHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          Icons.rocket_launch_rounded,
          size: 64,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 16),
        const Text(
          'Show an ad, get an ad shown',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Join the community-driven ad exchange.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey),
        ),
      ],
    );
  }
}

class Section extends StatelessWidget {
  final String title;
  const Section({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Colors.grey,
        ),
      ),
    );
  }
}
