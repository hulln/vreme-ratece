import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing


DATA_PATH = "data/clean_ratece.csv"
MODEL_SUMMARY_PATH = "analysis/forecast_model_summary.csv"
FORECAST_PATH = "analysis/forecast_2026_2035.csv"


VARIABLES = {
    "avg_temp": "povp. T [°C]",
    "avg_min_temp": "povp. min T [°C]",
    "snow_cover_days": "št. dni s snežno odejo",
    "snowfall_days": "št. dni s snegom >0.1 mm",
    "max_snow_cm": "max višina snega [cm]",
    "frost_days": "št. mrzlih dni",
    "ice_days": "št. ledenih dni",
}


def mae_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> tuple[float, float]:
    err = y_true - y_pred
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err**2)))
    return mae, rmse


def one_step_backtest(series: np.ndarray, years: np.ndarray, n_test: int = 15) -> dict:
    start = len(series) - n_test
    y_true = []
    preds = {"naive": [], "linear": [], "holt": []}

    for i in range(start, len(series)):
        train = series[:i]
        train_years = years[:i]
        y_true.append(series[i])

        preds["naive"].append(float(train[-1]))

        coeff = np.polyfit(train_years, train, 1)
        preds["linear"].append(float(coeff[0] * years[i] + coeff[1]))

        fit = ExponentialSmoothing(
            train,
            trend="add",
            seasonal=None,
            initialization_method="estimated",
        ).fit(optimized=True)
        preds["holt"].append(float(fit.forecast(1)[0]))

    y_true_arr = np.array(y_true, dtype=float)
    result = {"test_start_year": int(years[start]), "test_end_year": int(years[-1]), "metrics": {}}
    for model_name, y_pred in preds.items():
        y_pred_arr = np.array(y_pred, dtype=float)
        mae, rmse = mae_rmse(y_true_arr, y_pred_arr)
        result["metrics"][model_name] = {"mae": mae, "rmse": rmse}
    return result


def fit_and_forecast(
    model_name: str, series: np.ndarray, years: np.ndarray, horizon: int = 10
) -> np.ndarray:
    future_years = np.arange(int(years[-1]) + 1, int(years[-1]) + horizon + 1)
    if model_name == "naive":
        fc = np.array([float(series[-1])] * horizon, dtype=float)
    elif model_name == "linear":
        coeff = np.polyfit(years, series, 1)
        fc = coeff[0] * future_years + coeff[1]
    elif model_name == "holt":
        fit = ExponentialSmoothing(
            series,
            trend="add",
            seasonal=None,
            initialization_method="estimated",
        ).fit(optimized=True)
        fc = np.array(fit.forecast(horizon), dtype=float)
    else:
        raise ValueError(f"Unknown model: {model_name}")
    return fc


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    df = df[df["leto"] >= 1949].copy().sort_values("leto")
    years = df["leto"].to_numpy(dtype=float)

    model_rows = []
    forecast_rows = []

    for key, col in VARIABLES.items():
        series = df[col].to_numpy(dtype=float)
        bt = one_step_backtest(series, years, n_test=15)
        metrics = bt["metrics"]

        best_model = min(metrics.keys(), key=lambda m: (metrics[m]["mae"], metrics[m]["rmse"]))
        best_rmse = metrics[best_model]["rmse"]

        for model_name in ["naive", "linear", "holt"]:
            model_rows.append(
                {
                    "variable": key,
                    "model": model_name,
                    "test_start_year": bt["test_start_year"],
                    "test_end_year": bt["test_end_year"],
                    "mae": round(metrics[model_name]["mae"], 3),
                    "rmse": round(metrics[model_name]["rmse"], 3),
                    "best_model": model_name == best_model,
                }
            )

        fc = fit_and_forecast(best_model, series, years, horizon=10)
        # Approximate 95% prediction interval from one-step RMSE, widened by sqrt(h).
        # This is a practical approximation, not a full probabilistic model interval.
        for h, value in enumerate(fc, start=1):
            width = 1.96 * best_rmse * np.sqrt(h)
            lo = float(value - width)
            hi = float(value + width)
            if any(token in key for token in ["days", "snow_cm"]):
                lo = max(0.0, lo)
                value = max(0.0, float(value))
                hi = max(0.0, hi)

            forecast_rows.append(
                {
                    "variable": key,
                    "model": best_model,
                    "year": int(years[-1]) + h,
                    "forecast": round(float(value), 3),
                    "pi95_low_approx": round(lo, 3),
                    "pi95_high_approx": round(hi, 3),
                }
            )

    pd.DataFrame(model_rows).to_csv(MODEL_SUMMARY_PATH, index=False)
    pd.DataFrame(forecast_rows).to_csv(FORECAST_PATH, index=False)

    print(f"Wrote {MODEL_SUMMARY_PATH}")
    print(f"Wrote {FORECAST_PATH}")


if __name__ == "__main__":
    main()
