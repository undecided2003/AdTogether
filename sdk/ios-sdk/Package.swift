// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AdTogether",
    platforms: [
        .iOS(.v15),
        .macOS(.v11),
        .macCatalyst(.v15)
    ],
    products: [
        .library(
            name: "AdTogether",
            targets: ["AdTogether"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "AdTogether",
            dependencies: [],
            path: "Sources/AdTogether"
        )
    ]
)
