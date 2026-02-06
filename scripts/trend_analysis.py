import pandas as pd
import numpy as np
from scipy import stats

# Load data
df = pd.read_csv('data/clean_ratece.csv', skiprows=[1])

# Remove rows with missing data
df = df.dropna()

years = df['leto'].values
avg_temp = df['povp. T [°C]'].values
avg_min_temp = df['povp. min T [°C]'].values
snow_days = df['št. dni s snežno odejo'].values
snowfall_days = df['št. dni s snegom >0.1 mm'].values
max_snow = df['max višina snega [cm]'].values
ice_days = df['št. ledenih dni'].values
frost_days = df['št. mrzlih dni'].values

# Calculate linear regression for each variable
def calc_trend(years, values, per_decade=True):
    slope, intercept, r_value, p_value, std_err = stats.linregress(years, values)
    r_squared = r_value ** 2
    if per_decade:
        slope_decade = slope * 10
        return slope_decade, r_squared, p_value
    return slope, r_squared, p_value

# Temperature trends
temp_trend, temp_r2, temp_p = calc_trend(years, avg_temp)
min_temp_trend, min_temp_r2, min_temp_p = calc_trend(years, avg_min_temp)

# Snow trends
snow_days_trend, snow_days_r2, snow_days_p = calc_trend(years, snow_days)
snowfall_days_trend, snowfall_days_r2, snowfall_days_p = calc_trend(years, snowfall_days)
max_snow_trend, max_snow_r2, max_snow_p = calc_trend(years, max_snow)

# Ice and frost days trends
ice_days_trend, ice_days_r2, ice_days_p = calc_trend(years, ice_days)
frost_days_trend, frost_days_r2, frost_days_p = calc_trend(years, frost_days)

# Print results
print("=" * 60)
print("TEMPERATURE TRENDS")
print("=" * 60)
print(f"Average Temperature: {temp_trend:+.3f} °C/decade (R² = {temp_r2:.3f}, p = {temp_p:.4f})")
print(f"Average Min Temperature: {min_temp_trend:+.3f} °C/decade (R² = {min_temp_r2:.3f}, p = {min_temp_p:.4f})")

print("\n" + "=" * 60)
print("SNOW TRENDS")
print("=" * 60)
print(f"Snow Cover Days: {snow_days_trend:+.2f} days/decade (R² = {snow_days_r2:.3f}, p = {snow_days_p:.4f})")
print(f"Snowfall Days: {snowfall_days_trend:+.2f} days/decade (R² = {snowfall_days_r2:.3f}, p = {snowfall_days_p:.4f})")
print(f"Max Snow Height: {max_snow_trend:+.2f} cm/decade (R² = {max_snow_r2:.3f}, p = {max_snow_p:.4f})")

print("\n" + "=" * 60)
print("FROST/ICE TRENDS")
print("=" * 60)
print(f"Ice Days: {ice_days_trend:+.2f} days/decade (R² = {ice_days_r2:.3f}, p = {ice_days_p:.4f})")
print(f"Frost Days: {frost_days_trend:+.2f} days/decade (R² = {frost_days_r2:.3f}, p = {frost_days_p:.4f})")

print("\n" + "=" * 60)
print("COMPARISON")
print("=" * 60)
print(f"Snow cover decline rate: {abs(snow_days_trend):.2f} days/decade")
print(f"Snowfall decline rate: {abs(snowfall_days_trend):.2f} days/decade")
print(f"Ratio: Snow cover declining {abs(snow_days_trend)/abs(snowfall_days_trend):.1f}x faster than snowfall")

print("\n" + "=" * 60)
print("PERIOD COMPARISONS - VERIFICATION")
print("=" * 60)

# Split into periods
period1 = df[df['leto'].between(1949, 1979)]
period2 = df[df['leto'].between(1980, 2004)]
period3 = df[df['leto'].between(2005, 2025)]

for i, (period, name) in enumerate([(period1, "1949-1979"), (period2, "1980-2004"), (period3, "2005-2025")], 1):
    print(f"\nPeriod {i}: {name}")
    print(f"  Avg Temp: {period['povp. T [°C]'].mean():.1f} °C")
    print(f"  Snow Days: {period['št. dni s snežno odejo'].mean():.0f} days")
    print(f"  Max Snow: {period['max višina snega [cm]'].mean():.0f} cm")
    print(f"  Ice Days: {period['št. ledenih dni'].mean():.0f} days")

print("\n" + "=" * 60)
print("DATA QUALITY")
print("=" * 60)
print(f"Total years: {len(years)}")
print(f"First year: {years[0]}, Last year: {years[-1]}")
print(f"Missing years: {2025 - 1949 + 1 - len(years)}")
