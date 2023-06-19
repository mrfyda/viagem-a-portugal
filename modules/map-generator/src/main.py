"""
Generates a JSON file with the coordinates of the towns from the input of a CSV file.
"""

import csv
import json
import requests

# https://nominatim.openstreetmap.org/ui/search.html
API_ENDPOINT = "https://pt.wikipedia.org/w/api.php"

# Path to the input CSV file
INPUT_CSV_FILE = "resources/toponymic-index.csv"

# Path to the output JSON file
OUTPUT_JSON_FILE = "output.json"


def create_town_object(town_name, latitude, longitude):
    return {"name": town_name, "latitude": latitude, "longitude": longitude}


def get_coordinates_for_town(town_name):
    params = {
        "action": "query",
        "format": "json",
        "prop": "coordinates",
        "titles": town_name,
    }
    response = requests.get(API_ENDPOINT, params=params, timeout=10)
    data = response.json()

    pages = data["query"]["pages"]
    page_id = next(iter(pages))
    coordinates = pages[page_id].get("coordinates")

    if coordinates:
        lat = coordinates[0]["lat"]
        lon = coordinates[0]["lon"]
        return create_town_object(town_name, float(lat), float(lon))

    return None


def process_csv():
    town_data_list = []

    with open(INPUT_CSV_FILE, "r", encoding="utf-8") as csv_file:  # Specify the encoding explicitly
        csv_reader = csv.reader(csv_file)
        for row in csv_reader:
            town_name = row[0].strip()
            if town_name:
                town_data = get_coordinates_for_town(town_name)
                if town_data:
                    town_data_list.append(town_data)
                    print(f"Coordinates found for '{town_name}'")
                else:
                    town_data_list.append(
                        create_town_object(town_name, 0, 0))
                    print(f"Coordinates not found for '{town_name}'")

    with open(OUTPUT_JSON_FILE, "w", encoding="utf-8") as json_file:
        json.dump(town_data_list, json_file, indent=2)

    print(f"Town data saved to {OUTPUT_JSON_FILE}")


# Run the script
process_csv()
