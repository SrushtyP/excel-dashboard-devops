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

    # Read file
    if file.filename.endswith('.csv'):
        df = pd.read_csv(filepath, na_values=['', ' '])
    else:
        df = pd.read_excel(filepath, na_values=['', ' '])

    # Drop fully empty rows
    df = df.dropna(how='all')

    rows, cols_count = df.shape
    columns = df.columns.tolist()

    # Clean preview — replace NaN with empty string for display only
    preview_df = df.head(5).fillna('')
    preview = preview_df.to_html(classes='preview-table', index=False)

    # Find date/string column for x-axis
    str_cols = df.select_dtypes(exclude='number').columns.tolist()
    x_col = str_cols[0] if str_cols else None

    # Get numeric columns that have actual data
    numeric_cols = [
        col for col in df.select_dtypes(include='number').columns
        if df[col].notna().sum() > 0
    ]

    charts = []

    # ── Chart 1: Bar chart — actual values per date ──────────────────
    if numeric_cols:
        col = numeric_cols[0]
        plot_df = df[[x_col, col]].dropna().copy() if x_col else df[[col]].dropna().copy()

        # Color code — highlight the minimum value (cost drop day)
        if x_col and len(plot_df) > 1:
            min_val = plot_df[col].min()
            plot_df['color'] = plot_df[col].apply(
                lambda v: 'Cost Drop (Destroy Day)' if v == min_val else 'Normal Cost'
            )
            fig1 = px.bar(
                plot_df, x=x_col, y=col,
                color='color',
                color_discrete_map={
                    'Normal Cost': '#6C63FF',
                    'Cost Drop (Destroy Day)': '#43C59E'
                },
                title=f'{col} — Daily Cost (Green = Destroy Day)',
                template='plotly_white'
            )
        else:
            fig1 = px.bar(
                plot_df, x=x_col, y=col,
                title=f'{col} — Bar Chart',
                template='plotly_white',
                color_discrete_sequence=['#6C63FF']
            )
        fig1.update_xaxes(tickangle=45)
        fig1.update_layout(legend_title_text='')
        charts.append(json.dumps(fig1, cls=plotly.utils.PlotlyJSONEncoder))

    # ── Chart 2: Line chart showing actual trend + forecast ──────────
    if len(numeric_cols) >= 1:
        actual_col = numeric_cols[0]
        forecast_col = next((c for c in numeric_cols if 'forecast' in c.lower()), None)

        if x_col and forecast_col:
            # Combine actual and forecast on same chart
            actual_df = df[[x_col, actual_col]].dropna().copy()
            actual_df['Type'] = 'Actual'
            actual_df = actual_df.rename(columns={actual_col: 'Value'})

            forecast_df = df[[x_col, forecast_col]].dropna().copy()
            forecast_df['Type'] = 'Forecast'
            forecast_df = forecast_df.rename(columns={forecast_col: 'Value'})

            combined = pd.concat([actual_df, forecast_df], ignore_index=True)

            fig2 = px.line(
                combined, x=x_col, y='Value',
                color='Type',
                color_discrete_map={
                    'Actual': '#6C63FF',
                    'Forecast': '#FF6584'
                },
                title='Actual vs Forecast Cost',
                template='plotly_white',
                markers=True
            )
            fig2.update_xaxes(tickangle=45)
            fig2.update_layout(legend_title_text='')
        else:
            col = numeric_cols[0]
            plot_df = df[[x_col, col]].dropna() if x_col else df[[col]].dropna()
            fig2 = px.line(
                plot_df, x=x_col, y=col,
                title=f'{col} — Trend Line',
                template='plotly_white',
                color_discrete_sequence=['#43C59E'],
                markers=True
            )
            fig2.update_xaxes(tickangle=45)

        charts.append(json.dumps(fig2, cls=plotly.utils.PlotlyJSONEncoder))

    # ── Chart 3: Forecast only line chart ────────────────────────────
    forecast_col = next((c for c in numeric_cols if 'forecast' in c.lower()), None)
    if x_col and forecast_col:
        plot_df = df[[x_col, forecast_col]].dropna()
        fig3 = px.line(
            plot_df, x=x_col, y=forecast_col,
            title=f'{forecast_col} — Full Month Forecast (INR)',
            template='plotly_white',
            color_discrete_sequence=['#FF6584'],
            markers=True
        )
        fig3.update_xaxes(tickangle=45)
        charts.append(json.dumps(fig3, cls=plotly.utils.PlotlyJSONEncoder))

    # ── Chart 4: Pie chart — actual costs only ────────────────────────
    if x_col and numeric_cols:
        col = numeric_cols[0]
        plot_df = df[[x_col, col]].dropna()
        # Only use rows where value > 0.01 so tiny values show properly
        pie_data = plot_df.groupby(x_col)[col].sum().reset_index()
        pie_data = pie_data[pie_data[col] > 0]

        # Format labels to show actual cost
        pie_data['label'] = pie_data.apply(
            lambda r: f"{r[x_col]} (${r[col]:.4f})", axis=1
        )

        fig4 = px.pie(
            pie_data,
            names='label',
            values=col,
            title=f'Cost Distribution by Date — {col}',
            template='plotly_white'
        )
        fig4.update_traces(textinfo='label+percent')
        charts.append(json.dumps(fig4, cls=plotly.utils.PlotlyJSONEncoder))

    return render_template('dashboard.html',
                           filename=file.filename,
                           rows=rows, cols=cols_count,
                           columns=columns,
                           preview=preview,
                           charts=charts)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)