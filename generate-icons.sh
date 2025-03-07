#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p icons

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    exit 1
fi

# Base icon (assuming you have a base.png file)
BASE_ICON="base.png"

# Generate icons of different sizes
convert "$BASE_ICON" -resize 72x72 icons/icon-72x72.png
convert "$BASE_ICON" -resize 96x96 icons/icon-96x96.png
convert "$BASE_ICON" -resize 128x128 icons/icon-128x128.png
convert "$BASE_ICON" -resize 144x144 icons/icon-144x144.png
convert "$BASE_ICON" -resize 152x152 icons/icon-152x152.png
convert "$BASE_ICON" -resize 192x192 icons/icon-192x192.png
convert "$BASE_ICON" -resize 384x384 icons/icon-384x384.png
convert "$BASE_ICON" -resize 512x512 icons/icon-512x512.png

echo "Icons generated successfully!" 