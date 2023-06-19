import './App.css';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet'

import locations from "./locations.json"
import { LatLngExpression } from 'leaflet';


function App() {

  const others = [
    {
      "name": "Carrazedo de Montenegro",
      "latitude": 41.566667,
      "longitude": -7.433333
    },
    {
      "name": "Chaves",
      "latitude": 41.738108,
      "longitude": -7.475002
    },
    {
      "name": "Rebordelo",
      "latitude": 41.739444,
      "longitude": -7.163889
    },
    {
      "name": "Vinhais",
      "latitude": 41.832639,
      "longitude": -7.008054
    },
    {
      "name": "Bragança",
      "latitude": 41.806667,
      "longitude": -6.758889
    },
    {
      "name": "Sacoias",
      "latitude": 41.859935,
      "longitude": -6.697449
    },
    {
      "name": "Rio de Onor",
      "latitude": 41.940278,
      "longitude": -6.616389
    },
    {
      "name": "Mirandela",
      "latitude": 41.483333,
      "longitude": -7.183333
    },
    {
      "name": "Junqueira (povoação perto de Moncorvo)",
      "latitude": 41.269488,
      "longitude": -7.081987
    },
    {
      "name": "Torre de Moncorvo",
      "latitude": 41.173889,
      "longitude": -7.05
    },
    {
      "name": "Mogadouro",
      "latitude": 41.333333,
      "longitude": -6.716667
    },
    {
      "name": "Sendim",
      "latitude": 41.389444,
      "longitude": -6.425833
    },
    {
      "name": "Duas Igrejas",
      "latitude": 41.473056,
      "longitude": -6.358056
    },
    {
      "name": "Miranda do Douro",
      "latitude": 41.5,
      "longitude": -6.266667
    },
    {
      "name": "Vimioso",
      "latitude": 41.582419,
      "longitude": -6.5329175
    },
    {
      "name": "Melgaço",
      "latitude": 42.115032,
      "longitude": -8.259563
    },
    {
      "name": "Nossa Senhora da Orada",
      "latitude": 42.120180,
      "longitude": -8.252602
    },
    {
      "name": "Monção",
      "latitude": 42.077111,
      "longitude": -8.481812
    },
    {
      "name": "Valença",
      "latitude": 42.026888,
      "longitude": -8.642140
    },
    {
      "name": "Caminha",
      "latitude": 41.873167,
      "longitude": -8.837819
    },
    {
      "name": "Braga",
      "latitude": 41.5454185,
      "longitude": -8.426472
    },
    {
      "name": "Sameiro (Braga)",
      "latitude": 41.542136,
      "longitude": -8.369678
    },
    {
      "name": "Briteiros (citânia)",
      "latitude": 41.526772,
      "longitude": -8.315009
    },
    {
      "name": "Bom Jesus (Braga)",
      "latitude": 41.554839,
      "longitude": -8.377011
    },
    {
      "name": "Ponte da Barca",
      "latitude": 41.808321,
      "longitude": -8.420333
    },
    {
      "name": "Arcos de Valdevez",
      "latitude": 41.844571,
      "longitude": -8.417808
    },
    {
      "name": "Gondoriz",
      "latitude": 41.892139,
      "longitude": -8.420066
    },
    {
      "name": "Sistelo",
      "latitude": 41.972987,
      "longitude": -8.374347
    },
    {
      "name": "Longos Vales",
      "latitude": 42.051414,
      "longitude": -8.447682
    },
    {
      "name": "Terras de Bouro",
      "latitude": 41.719026,
      "longitude": -8.308163
    },
    {
      "name": "Chamoim",
      "latitude": 41.734706,
      "longitude": -8.270501
    },
    {
      "name": "São Bento da Porta Aberta",
      "latitude": 41.690259,
      "longitude": -8.203455
    },
    {
      "name": "Cidadelhe",
      "latitude": 41.859653,
      "longitude": -8.244494
    },
    {
      "name": "Giela",
      "latitude": 41.858757,
      "longitude": -8.407566
    },
    {
      "name": "Real",
      "latitude": 41.569170,
      "longitude": -8.647499
    },
  ]

  // https://nominatim.openstreetmap.org/ui/search.html

  others.forEach(location => {
    const index = locations.findIndex(l => l.name === location.name)
    locations.splice(index, 1)
    locations.push(location)
  })

  const routes = [
    // Vila Real -> Chaves
    ["Vila Real", "Murça", "Jou", "Carrazedo de Montenegro", "Chaves"],
    // Chaves -> Bragança
    ["Chaves", "Rebordelo", "Vinhais", "Bragança"],
    ["Chaves", "Outeiro Seco"],
    ["Bragança", "Sacoias", "Rio de Onor"],
    // Bragança -> Miranda do Douro
    ["Bragança", "Mirandela", "Vila Flor", "Junqueira (povoação perto de Moncorvo)", "Torre de Moncorvo", "Mogadouro", "Sendim", "Duas Igrejas", "Miranda do Douro"],
    ["Mogadouro", "Azinhoso"],
    // Miranda do Douro -> Vimioso
    ["Miranda do Douro", "Malhadas", "Vimioso"],
    // Castro Laboreiro -> Melgaço
    ["Castro Laboreiro", "Melgaço"],
    ["Melgaço", "Nossa Senhora da Orada"],
    // Melgaço -> Monção
    ["Melgaço", "Monção"],
    // Monção -> Viana do Castelo
    ["Monção", "Valença", "Vila Nova de Cerveira", "Caminha", "Paredes de Coura", "Rubiães", "Romarigães", "Ponte de Lima", "Bertiandos", "Viana do Castelo"],
    // Viana do Castelo -> Barcelos
    ["Viana do Castelo", "Balugães", "Barcelos"],
    ["Abade de Neiva", "Barcelos"],
    // Barcelos -> Braga
    ["Barcelos", "Real", "Braga"],
    ["Braga", "Sameiro (Braga)", "Briteiros (citânia)", "Bom Jesus (Braga)"],
    // Braga -> Monção
    ["Braga", "Ponte da Barca", "Arcos de Valdevez", "Gondoriz", "Sistelo", "Merufe", "Longos Vales", "Monção"],
    ["Braga", "Terras de Bouro", "Chamoim", "Covide", "São Bento da Porta Aberta"],
    ["Ponte da Barca", "Bravães"],
    ["Ponte da Barca", "Cidadelhe", "Lindoso"],
    ["Arcos de Valdevez", "Giela"],
  ]

  const paths: LatLngExpression[][] = routes.map(route =>
    route.map(town_name => {
      const location = locations.find(l => l.name === town_name)
      if (!location) throw new Error(`Location ${town_name} not found`)
      return [location!.latitude, location!.longitude]
    })
  )

  return (
    <MapContainer center={[39.414, -8.075]} zoom={7} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {locations.map(location =>
        <Marker position={[location.latitude, location.longitude]}>
          <Tooltip>{location.name}</Tooltip>
        </Marker>
      )}

      <Polyline positions={paths} />
    </MapContainer>
  );
}

export default App;
