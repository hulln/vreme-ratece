import pandas as pd
from pathlib import Path

SRC_PATH = Path("src/1bs8xpBJ")
OUT_PATH = Path("output/clean_ratece.csv")


def main() -> None:
    df = pd.read_csv(SRC_PATH)
    df = df.rename(columns=lambda c: c.strip())

    # Drop fully empty columns
    empty_cols = [c for c in df.columns if df[c].isna().all()]
    df = df.drop(columns=empty_cols)

    # Drop constant station metadata columns
    for col in ["station id", "station name"]:
        if col in df.columns:
            df = df.drop(columns=[col])

    # Rename year column to Slovenian label
    if "valid" in df.columns:
        df = df.rename(columns={"valid": "leto"})

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)


if __name__ == "__main__":
    main()
