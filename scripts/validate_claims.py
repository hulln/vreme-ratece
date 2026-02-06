import pandas as pd
import numpy as np
import statsmodels.api as sm
from scipy import stats
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.holtwinters import ExponentialSmoothing


DATA_PATH = "data/clean_ratece.csv"


def trend_stats(year: np.ndarray, values: np.ndarray) -> dict:
    x = sm.add_constant(year)
    model = sm.OLS(values, x).fit()
    hac = model.get_robustcov_results(cov_type="HAC", maxlags=3)
    tau, p_mk = stats.kendalltau(year, values)
    sen = stats.theilslopes(values, year, 0.95)
    lb = acorr_ljungbox(model.resid, lags=[5], return_df=True)

    return {
        "slope_per_decade": float(model.params[1] * 10),
        "r2": float(model.rsquared),
        "p_ols": float(model.pvalues[1]),
        "p_hac": float(hac.pvalues[1]),
        "tau": float(tau),
        "p_mk": float(p_mk),
        "sen_slope_per_decade": float(sen.slope * 10),
        "lb_pvalue_lag5": float(lb["lb_pvalue"].iloc[0]),
    }


def rolling_forecast_metrics(series: np.ndarray, years: np.ndarray, n_test: int = 15) -> dict:
    start = len(series) - n_test
    y_true, y_naive, y_linear, y_holt = [], [], [], []

    for i in range(start, len(series)):
        train = series[:i]
        train_years = years[:i]
        y_true.append(series[i])

        y_naive.append(train[-1])

        coeff = np.polyfit(train_years, train, 1)
        y_linear.append(coeff[0] * years[i] + coeff[1])

        fit = ExponentialSmoothing(
            train,
            trend="add",
            seasonal=None,
            initialization_method="estimated",
        ).fit(optimized=True)
        y_holt.append(float(fit.forecast(1)[0]))

    def mae_rmse(pred):
        err = np.array(y_true) - np.array(pred)
        return float(np.mean(np.abs(err))), float(np.sqrt(np.mean(err**2)))

    m_naive = mae_rmse(y_naive)
    m_linear = mae_rmse(y_linear)
    m_holt = mae_rmse(y_holt)
    return {
        "test_start_year": int(years[start]),
        "test_end_year": int(years[-1]),
        "naive": {"mae": m_naive[0], "rmse": m_naive[1]},
        "linear": {"mae": m_linear[0], "rmse": m_linear[1]},
        "holt": {"mae": m_holt[0], "rmse": m_holt[1]},
    }


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    df = df[df["leto"] >= 1949].copy().sort_values("leto")
    years = df["leto"].to_numpy()

    series_map = {
        "avg_temp": "povp. T [°C]",
        "avg_min_temp": "povp. min T [°C]",
        "snow_cover_days": "št. dni s snežno odejo",
        "snowfall_days": "št. dni s snegom >0.1 mm",
        "max_snow_cm": "max višina snega [cm]",
        "frost_days": "št. mrzlih dni",
        "ice_days": "št. ledenih dni",
    }

    print("TREND VALIDATION (1949-2025)")
    print("metric,slope/decade,r2,p_ols,p_hac,p_mk,sen/decade,lb_p(5)")
    trend_rows = {}
    for key, col in series_map.items():
        values = df[col].to_numpy()
        out = trend_stats(years, values)
        trend_rows[key] = out
        print(
            f"{key},{out['slope_per_decade']:+.3f},{out['r2']:.3f},"
            f"{out['p_ols']:.4g},{out['p_hac']:.4g},{out['p_mk']:.4g},"
            f"{out['sen_slope_per_decade']:+.3f},{out['lb_pvalue_lag5']:.4g}"
        )

    snow_cover = trend_rows["snow_cover_days"]["slope_per_decade"]
    snowfall = trend_rows["snowfall_days"]["slope_per_decade"]
    ratio = abs(snow_cover) / abs(snowfall)
    print(f"\nratio_snow_cover_vs_snowfall={ratio:.3f}")

    fc = rolling_forecast_metrics(df["povp. T [°C]"].to_numpy(), years, n_test=15)
    print(
        "\nFORECAST BACKTEST (1-step rolling-origin, "
        f"{fc['test_start_year']}-{fc['test_end_year']})"
    )
    for model in ["naive", "linear", "holt"]:
        print(
            f"{model},MAE={fc[model]['mae']:.3f},RMSE={fc[model]['rmse']:.3f}"
        )

    fit = ExponentialSmoothing(
        df["povp. T [°C]"].to_numpy(),
        trend="add",
        seasonal=None,
        initialization_method="estimated",
    ).fit(optimized=True)
    preds = fit.forecast(5)
    print("\nHOLT POINT FORECASTS")
    for i, value in enumerate(preds, start=1):
        print(f"{2025 + i},{float(value):.3f}")


if __name__ == "__main__":
    main()
