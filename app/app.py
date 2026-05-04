from flask import Flask, render_template, request, redirect, url_for
import pandas as pd
import plotly.express as px
import plotly
import json
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files.get('file')
    if not file or not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        return render_template('index.html', error="Please upload a valid Excel or CSV file.")

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    # Read file — treat empty strings as NaN
    if file.filename.endswith('.csv'):
        df = pd.read_csv(filepath, na_values=['', ' '])
    else:
        df = pd.read_excel(filepath, na_values=['', ' '])

    # Drop rows where ALL values are NaN
    df = df.dropna(how='all')

    rows, cols = df.shape
    columns = df.columns.tolist()
    preview = df.head(5).to_html(classes='preview-table', index=False)

    # Get numeric columns that have at least some real data
    numeric_cols = [
        col for col in df.select_dtypes(include='number').columns
        if df[col].notna().sum() > 0
    ]

    # Get date/string column for x-axis if available
    str_cols = df.select_dtypes(exclude='number').columns.tolist()
    x_col = str_cols[0] if str_cols else None

    charts = []

    if len(numeric_cols) >= 1:
        col = numeric_cols[0]
        # Drop NaN for this specific column before plotting
        plot_df = df[[x_col, col]].dropna() if x_col else df[[col]].dropna()

        fig1 = px.bar(
            plot_df,
            x=x_col,
            y=col,
            title=f'{col} — Bar Chart',
            template='plotly_white',
            color_discrete_sequence=['#6C63FF']
        )
        fig1.update_xaxes(tickangle=45)
        charts.append(json.dumps(fig1, cls=plotly.utils.PlotlyJSONEncoder))

    if len(numeric_cols) >= 2:
        col1, col2 = numeric_cols[0], numeric_cols[1]
        plot_df = df[[col1, col2]].dropna()

        fig2 = px.scatter(
            plot_df,
            x=col1,
            y=col2,
            title=f'{col1} vs {col2}',
            template='plotly_white',
            color_discrete_sequence=['#FF6584']
        )
        charts.append(json.dumps(fig2, cls=plotly.utils.PlotlyJSONEncoder))

    if len(numeric_cols) >= 1:
        col = numeric_cols[0]
        plot_df = df[[x_col, col]].dropna() if x_col else df[[col]].dropna()

        fig3 = px.line(
            plot_df,
            x=x_col,
            y=col,
            title=f'{col} — Trend Line',
            template='plotly_white',
            color_discrete_sequence=['#43C59E'],
            markers=True
        )
        fig3.update_xaxes(tickangle=45)
        charts.append(json.dumps(fig3, cls=plotly.utils.PlotlyJSONEncoder))

    # Pie chart — group by first string column
    if x_col and len(numeric_cols) >= 1:
        col = numeric_cols[0]
        plot_df = df[[x_col, col]].dropna()
        pie_data = plot_df.groupby(x_col)[col].sum().reset_index().head(10)

        fig4 = px.pie(
            pie_data,
            names=x_col,
            values=col,
            title=f'{col} by {x_col}',
            template='plotly_white'
        )
        charts.append(json.dumps(fig4, cls=plotly.utils.PlotlyJSONEncoder))

    return render_template('dashboard.html',
                           filename=file.filename,
                           rows=rows, cols=cols,
                           columns=columns,
                           preview=preview,
                           charts=charts)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)