import pandas as pd
import numpy as np
from scipy import stats

# Load data
df = pd.read_csv('output/clean_ratece.csv')
df = df[df['leto'] >= 1949].copy()

print("=== TREND ANALYSIS ===\n")

# 1. Snowfall vs Snow Cover Analysis
print("1. SNOWFALL vs SNOW COVER:")
snowfall = df['št. dni s snegom >0.1 mm'].dropna()
snow_cover = df['št. dni s snežno odejo'].dropna()

if len(snowfall) > 0 and len(snow_cover) > 0:
    years_snowfall = df.loc[snowfall.index, 'leto']
    years_snow_cover = df.loc[snow_cover.index, 'leto']
    
    slope_snowfall, intercept_snowfall, r_snowfall, p_snowfall, _ = stats.linregress(years_snowfall, snowfall)
    slope_snow_cover, intercept_snow_cover, r_snow_cover, p_snow_cover, _ = stats.linregress(years_snow_cover, snow_cover)
    
    print(f"   Snowfall days trend: {slope_snowfall:.2f} days/year (R²={r_snowfall**2:.3f}, p={p_snowfall:.4f})")
    print(f"   Snow cover days trend: {slope_snow_cover:.2f} days/year (R²={r_snow_cover**2:.3f}, p={p_snow_cover:.4f})")
    
    # Check if difference between them is meaningful
    diff = abs(slope_snow_cover) - abs(slope_snowfall)
    print(f"   Difference: {diff:.2f} days/year")
    if abs(diff) > 0.1:
        print(f"   → Snow cover declining faster than snowfall? {abs(slope_snow_cover) > abs(slope_snowfall)}")
    else:
        print(f"   → Both declining at similar rates")
else:
    print("   Insufficient data")

print("\n2. AVERAGE vs MINIMUM TEMPERATURE:")
avg_temp = df['povp. T [°C]'].dropna()
min_temp = df['povp. min T [°C]'].dropna()

if len(avg_temp) > 0 and len(min_temp) > 0:
    years_avg = df.loc[avg_temp.index, 'leto']
    years_min = df.loc[min_temp.index, 'leto']
    
    slope_avg, intercept_avg, r_avg, p_avg, _ = stats.linregress(years_avg, avg_temp)
    slope_min, intercept_min, r_min, p_min, _ = stats.linregress(years_min, min_temp)
    
    print(f"   Avg temp trend: {slope_avg:.4f} °C/year (R²={r_avg**2:.3f}, p={p_avg:.4f})")
    print(f"   Min temp trend: {slope_min:.4f} °C/year (R²={r_min**2:.3f}, p={p_min:.4f})")
    
    # Per decade
    print(f"   Avg temp: {slope_avg*10:.2f} °C/decade")
    print(f"   Min temp: {slope_min*10:.2f} °C/decade")
    
    diff = slope_min - slope_avg
    print(f"   Difference: {diff:.4f} °C/year ({diff*10:.2f} °C/decade)")
    if abs(diff) > 0.003:  # More than 0.03°C per decade difference
        print(f"   → Minimum temps warming faster? {slope_min > slope_avg}")
    else:
        print(f"   → Both warming at similar rates")
else:
    print("   Insufficient data")

print("\n3. FROST DAYS vs ICE DAYS:")
frost = df['št. mrzlih dni'].dropna()
ice = df['št. ledenih dni'].dropna()

if len(frost) > 0:
    years_frost = df.loc[frost.index, 'leto']
    slope_frost, _, r_frost, p_frost, _ = stats.linregress(years_frost, frost)
    print(f"   Frost days trend: {slope_frost:.2f} days/year ({slope_frost*10:.1f} days/decade, R²={r_frost**2:.3f})")

if len(ice) > 0:
    years_ice = df.loc[ice.index, 'leto']
    slope_ice, _, r_ice, p_ice, _ = stats.linregress(years_ice, ice)
    print(f"   Ice days trend: {slope_ice:.2f} days/year ({slope_ice*10:.1f} days/decade, R²={r_ice**2:.3f})")

print("\n4. TEMPERATURE CHANGE (1949-2025):")
temp_1949 = df[df['leto'] == 1949]['povp. T [°C]'].values[0]
temp_2025 = df[df['leto'] == 2025]['povp. T [°C]'].values[0]
print(f"   1949: {temp_1949:.1f}°C")
print(f"   2025: {temp_2025:.1f}°C")
print(f"   Total change: {temp_2025 - temp_1949:.1f}°C over 76 years")

print("\n5. SNOW DAYS CHANGE (1949-2025):")
snow_1949 = df[df['leto'] == 1949]['št. dni s snežno odejo'].values[0]
snow_2025 = df[df['leto'] == 2025]['št. dni s snežno odejo'].values[0]
print(f"   1949: {snow_1949:.0f} days")
print(f"   2025: {snow_2025:.0f} days")
print(f"   Total change: {snow_2025 - snow_1949:.0f} days over 76 years")

print("\n=== INTERPRETATION GUIDE ===")
print("R² > 0.5: Strong trend")
print("R² 0.3-0.5: Moderate trend")
print("R² < 0.3: Weak trend")
print("p < 0.05: Statistically significant")
