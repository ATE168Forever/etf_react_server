#!/usr/bin/env python3
"""
Generate placeholder images for ETF Life apps
Requires: pillow
Install with: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

# App configurations
APPS = {
    'dividend-life': {
        'name': 'Dividend Life',
        'subtitle': 'ETF 股息日曆與配息追蹤',
        'description': '台股、美股股息日曆 | 除息/發放查詢 | 配息追蹤',
        'color': '#10b981'
    },
    'balance-life': {
        'name': 'Balance Life',
        'subtitle': '資產配置與平衡追蹤',
        'description': '投資組合平衡追蹤 | 資產配置分析 | 再平衡建議',
        'color': '#3b82f6'
    },
    'health-life': {
        'name': 'Health Life',
        'subtitle': '投資健檢與績效分析',
        'description': '投資組合健檢 | 績效分析 | 風險評估',
        'color': '#ef4444'
    },
    'wealth-life': {
        'name': 'Wealth Life',
        'subtitle': '財富累積與目標追蹤',
        'description': '財富累積追蹤 | 投資目標設定 | 達成進度分析',
        'color': '#f59e0b'
    },
    'conceptb-life': {
        'name': 'Concept Life',
        'subtitle': 'ETF 概念股追蹤',
        'description': 'ETF 概念股分析 | 成分股追蹤 | 主題投資管理',
        'color': '#8b5cf6'
    }
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_og_image(app_key, config, output_path):
    """Create OG image (1200x630)"""
    width, height = 1200, 630
    bg_color = (11, 16, 33)  # #0b1021

    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    try:
        # Try to use a better font if available
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 64)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        desc_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
        url_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except:
        # Fallback to default font
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        url_font = ImageFont.load_default()

    # Draw title
    title_bbox = draw.textbbox((0, 0), config['name'], font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((width - title_width) / 2, 200), config['name'],
              fill=(255, 255, 255), font=title_font)

    # Draw subtitle
    subtitle_bbox = draw.textbbox((0, 0), config['subtitle'], font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(((width - subtitle_width) / 2, 290), config['subtitle'],
              fill=hex_to_rgb(config['color']), font=subtitle_font)

    # Draw description
    desc_bbox = draw.textbbox((0, 0), config['description'], font=desc_font)
    desc_width = desc_bbox[2] - desc_bbox[0]
    draw.text(((width - desc_width) / 2, 380), config['description'],
              fill=(156, 163, 175), font=desc_font)

    # Draw URL
    url_text = f"etflife.org/{app_key}"
    url_bbox = draw.textbbox((0, 0), url_text, font=url_font)
    url_width = url_bbox[2] - url_bbox[0]
    draw.text(((width - url_width) / 2, 480), url_text,
              fill=(107, 114, 128), font=url_font)

    img.save(output_path, 'PNG')
    print(f"✓ Created: {output_path}")

def create_screenshot(app_key, config, output_path):
    """Create screenshot placeholder"""
    width, height = 1200, 800
    bg_color = (11, 16, 33)

    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    except:
        font = ImageFont.load_default()

    text = f"{config['name']}\nScreenshot Placeholder"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    draw.text(((width - text_width) / 2, (height - text_height) / 2), text,
              fill=hex_to_rgb(config['color']), font=font)

    img.save(output_path, 'PNG')
    print(f"✓ Created: {output_path}")

def create_favicon(size, output_path):
    """Create favicon"""
    bg_color = (11, 16, 33)
    accent_color = (16, 185, 129)  # Green

    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw a simple "E" for ETF Life
    margin = size // 4
    draw.rectangle([margin, margin, size - margin, size - margin],
                   outline=accent_color, width=max(1, size // 32))

    # Draw "E" shape
    bar_height = (size - 2 * margin) // 4
    draw.rectangle([margin, margin, size - margin, margin + bar_height], fill=accent_color)
    draw.rectangle([margin, size // 2 - bar_height // 2, size - margin - margin,
                   size // 2 + bar_height // 2], fill=accent_color)
    draw.rectangle([margin, size - margin - bar_height, size - margin, size - margin], fill=accent_color)

    img.save(output_path, 'PNG')
    print(f"✓ Created: {output_path}")

def create_logo(output_path):
    """Create ETF Life logo"""
    width, height = 512, 512
    bg_color = (255, 255, 255, 0)  # Transparent

    img = Image.new('RGBA', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
    except:
        font = ImageFont.load_default()

    text = "ETF Life"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    draw.text(((width - text_width) / 2, (height - text_height) / 2), text,
              fill=(16, 185, 129, 255), font=font)

    img.save(output_path, 'PNG')
    print(f"✓ Created: {output_path}")

def main():
    print("🎨 Generating placeholder images for ETF Life apps...\n")

    # Generate OG images and screenshots for each app
    for app_key, config in APPS.items():
        public_dir = f"apps/{app_key}/public"
        os.makedirs(public_dir, exist_ok=True)

        # OG image
        og_path = f"{public_dir}/{app_key}-og.png"
        create_og_image(app_key, config, og_path)

        # Screenshot
        screenshot_path = f"{public_dir}/{app_key}-screenshot.png"
        create_screenshot(app_key, config, screenshot_path)

    print()

    # Generate shared favicons (only need to create once, can be copied to other apps)
    print("Creating favicon sizes...")
    favicon_sizes = [16, 32, 192, 512]
    public_dir = "apps/dividend-life/public"

    for size in favicon_sizes:
        favicon_path = f"{public_dir}/favicon-{size}x{size}.png"
        create_favicon(size, favicon_path)

    # Apple touch icon
    apple_icon_path = f"{public_dir}/apple-touch-icon.png"
    create_favicon(180, apple_icon_path)

    print()

    # Generate logo
    print("Creating ETF Life logo...")
    logo_path = "apps/dividend-life/public/logo.png"
    create_logo(logo_path)

    print("\n✅ All placeholder images generated successfully!")
    print("\n📋 Next steps:")
    print("1. Copy favicon files to other app public directories")
    print("2. Replace placeholder images with actual designs")
    print("3. Ensure all images are optimized for web")

if __name__ == "__main__":
    main()
