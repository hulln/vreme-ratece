import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('data/clean_ratece.csv', skiprows=[1])
df = df.dropna()

print("=" * 70)
print("QA VERIFICATION REPORT")
print("=" * 70)

# 1. Check key data points mentioned in HTML
print("\n1. KEY DATA POINTS VERIFICATION:")
print("-" * 70)

# 1949 vs 2025
data_1949 = df[df['leto'] == 1949].iloc[0]
data_2025 = df[df['leto'] == 2025].iloc[0]
temp_diff = data_2025['povp. T [°C]'] - data_1949['povp. T [°C]']
snow_diff = data_1949['št. dni s snežno odejo'] - data_2025['št. dni s snežno odejo']

print(f"1949: Temp={data_1949['povp. T [°C]']}°C, Snow days={data_1949['št. dni s snežno odejo']}")
print(f"2025: Temp={data_2025['povp. T [°C]']}°C, Snow days={data_2025['št. dni s snežno odejo']}")
print(f"Temp difference: {temp_diff:.1f}°C (HTML says: +1,7°C) {'✓' if abs(temp_diff - 1.7) < 0.05 else '✗'}")
print(f"Snow days difference: {snow_diff:.0f} days (HTML says: -75 dni) {'✓' if abs(snow_diff - 75) < 1 else '✗'}")

# 1985 minimum
data_1985 = df[df['leto'] == 1985].iloc[0]
print(f"\n1985 abs minimum: {data_1985['abs. min T [°C]']}°C (HTML says: -26,4°C) {'✓' if data_1985['abs. min T [°C]'] == -26.4 else '✗'}")

# 1952 max snow
data_1952 = df[df['leto'] == 1952].iloc[0]
print(f"1952 max snow: {data_1952['max višina snega [cm]']} cm (HTML says: 240 cm) {'✓' if data_1952['max višina snega [cm]'] == 240 else '✗'}")

# 1978 coldest winter
data_1978 = df[df['leto'] == 1978].iloc[0]
print(f"\n1978 (coldest winter):")
print(f"  Avg temp: {data_1978['povp. T [°C]']}°C (HTML: 4,6°C) {'✓' if data_1978['povp. T [°C]'] == 4.6 else '✗'}")
print(f"  Abs min: {data_1978['abs. min T [°C]']}°C (HTML: -21,2°C) {'✓' if data_1978['abs. min T [°C]'] == -21.2 else '✗'}")
print(f"  Ice days: {data_1978['št. ledenih dni']} (HTML: 40 dni) {'✓' if data_1978['št. ledenih dni'] == 40 else '✗'}")
print(f"  Snow days: {data_1978['št. dni s snežno odejo']} (HTML: 155 dni) {'✓' if data_1978['št. dni s snežno odejo'] == 155 else '✗'}")

# 2024 warmest winter
data_2024 = df[df['leto'] == 2024].iloc[0]
print(f"\n2024 (warmest winter):")
print(f"  Avg temp: {data_2024['povp. T [°C]']}°C (HTML: 8,3°C) {'✓' if data_2024['povp. T [°C]'] == 8.3 else '✗'}")
print(f"  Abs min: {data_2024['abs. min T [°C]']}°C (HTML: -15,7°C) {'✓' if data_2024['abs. min T [°C]'] == -15.7 else '✗'}")
print(f"  Ice days: {data_2024['št. ledenih dni']} (HTML: 6 dni) {'✓' if data_2024['št. ledenih dni'] == 6 else '✗'}")
print(f"  Snow days: {data_2024['št. dni s snežno odejo']} (HTML: 99 dni) {'✓' if data_2024['št. dni s snežno odejo'] == 99 else '✗'}")

# 2. Verify period comparisons
print("\n" + "=" * 70)
print("2. PERIOD COMPARISONS VERIFICATION:")
print("-" * 70)

periods = [
    (1949, 1979, "1949-1979"),
    (1980, 2004, "1980-2004"),
    (2005, 2025, "2005-2025")
]

html_values = {
    "1949-1979": {"temp": 5.8, "snow_days": 129, "max_snow": 117, "ice_days": 33},
    "1980-2004": {"temp": 6.3, "snow_days": 121, "max_snow": 79, "ice_days": 29},
    "2005-2025": {"temp": 7.4, "snow_days": 106, "max_snow": 81, "ice_days": 21}
}

for start, end, name in periods:
    period = df[df['leto'].between(start, end)]
    avg_temp = period['povp. T [°C]'].mean()
    avg_snow = period['št. dni s snežno odejo'].mean()
    avg_max_snow = period['max višina snega [cm]'].mean()
    avg_ice = period['št. ledenih dni'].mean()
    
    html = html_values[name]
    
    print(f"\n{name}:")
    print(f"  Avg Temp: {avg_temp:.1f}°C (HTML: {html['temp']}°C) {'✓' if abs(avg_temp - html['temp']) < 0.05 else '✗ MISMATCH'}")
    print(f"  Snow Days: {avg_snow:.0f} (HTML: {html['snow_days']}) {'✓' if abs(avg_snow - html['snow_days']) < 1 else '✗ MISMATCH'}")
    print(f"  Max Snow: {avg_max_snow:.0f} cm (HTML: {html['max_snow']} cm) {'✓' if abs(avg_max_snow - html['max_snow']) < 2 else '✗ MISMATCH'}")
    print(f"  Ice Days: {avg_ice:.0f} (HTML: {html['ice_days']}) {'✓' if abs(avg_ice - html['ice_days']) < 1 else '✗ MISMATCH'}")

# 3. Check for actual coldest and warmest years
print("\n" + "=" * 70)
print("3. EXTREME YEARS VERIFICATION:")
print("-" * 70)

coldest = df.loc[df['povp. T [°C]'].idxmin()]
warmest = df.loc[df['povp. T [°C]'].idxmax()]

print(f"Actual coldest winter: {int(coldest['leto'])} with {coldest['povp. T [°C]']}°C")
print(f"HTML claims: 1978 with 4,6°C")
print(f"{'✓ CORRECT' if int(coldest['leto']) == 1978 else '✗ HTML IS WRONG'}")

print(f"\nActual warmest winter: {int(warmest['leto'])} with {warmest['povp. T [°C]']}°C")
print(f"HTML claims: 2024 with 8,3°C")
print(f"{'✓ CORRECT' if int(warmest['leto']) == 2024 else '✗ HTML IS WRONG'}")

# 4. Data completeness
print("\n" + "=" * 70)
print("4. DATA COMPLETENESS:")
print("-" * 70)
print(f"Total years in dataset: {len(df)}")
print(f"Year range: {int(df['leto'].min())} - {int(df['leto'].max())}")
print(f"Expected years: {2025 - 1949 + 1} = 77")
print(f"Missing years: {2025 - 1949 + 1 - len(df)}")
print(f"HTML claims: 77 let {'✓' if len(df) == 77 else '✗'}")

# 5. Calculate percentage decrease for 2025 snow vs 1952
print("\n" + "=" * 70)
print("5. PERCENTAGE CALCULATIONS:")
print("-" * 70)
percent_decrease = ((240 - 18) / 240) * 100
print(f"2025 snow (18 cm) vs 1952 snow (240 cm):")
print(f"Decrease: {percent_decrease:.1f}%")
print(f"HTML claims: 92% {'✓' if abs(percent_decrease - 92) < 1 else '✗'}")

print("\n" + "=" * 70)
print("QA REPORT COMPLETE")
print("=" * 70)
