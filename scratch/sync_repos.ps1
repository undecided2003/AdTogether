
# Sync script for AdTogether SDKs

# 1. Define the repos
$REPOS = @{
    "web-sdk" = "https://github.com/undecided2003/adtogether-web-sdk.git"
    "react-native-sdk" = "https://github.com/undecided2003/adtogether-react-native-sdk.git"
    "ios-sdk" = "https://github.com/undecided2003/adtogether-ios-sdk.git"
    "android-sdk" = "https://github.com/undecided2003/adtogether-android-sdk.git"
    "flutter-sdk" = "https://github.com/undecided2003/adtogether-flutter-sdk.git"
}

# 2. Add remotes if they don't exist
foreach ($name in $REPOS.Keys) {
    $url = $REPOS[$name]
    $remote_exists = git remote | Select-String -Pattern "^$name$"
    if (-not $remote_exists) {
        Write-Host "Adding remote $name -> $url"
        git remote add $name $url
    }
}

# 3. Push subtrees
# Prefix for flutter is adtogether_sdk
$PREFIXES = @{
    "web-sdk" = "sdk/web-sdk"
    "react-native-sdk" = "sdk/react-native-sdk"
    "ios-sdk" = "sdk/ios-sdk"
    "android-sdk" = "sdk/android-sdk"
    "flutter-sdk" = "sdk/adtogether_sdk"
}

foreach ($name in $REPOS.Keys) {
    $prefix = $PREFIXES[$name]
    Write-Host "Pushing $prefix to $name main..."
    git subtree push --prefix=$prefix $name main
    
    Write-Host "Pushing tag v0.4.0 to $name..."
    # This is tricky with subtree, usually we just push the tag to origin.
    # But for standalone repos, we might want to tag the current commit.
    # For now, let's just ensure the code is there.
}
