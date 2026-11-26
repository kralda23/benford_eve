import { useState } from 'react'
import './App.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

// Zaregistrování věcí co používa ChartJS, jinak by to nefungovalo
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend
)

// Očekávané procenta podle Benfordova zákonu
const benford_procenta: number[] = []
for (let d = 1; d <= 9; d++) {
  benford_procenta.push(Math.log10(1 + 1 / d) * 100)
}

// Vrátí první číslici čísla (1-9), když nejde tak 0
function prvni_cislice(cislo: number): number {
  let hodnota = Math.abs(cislo)
  if (hodnota === 0 || isNaN(hodnota)) {
    return 0
  }
  // Když je číslo menší nez 1, tak ho násobíme 10
  while (hodnota < 1) {
    hodnota = hodnota * 10
  }
  // Když je větší nebo rovna než 10, tak delíme 10
  while (hodnota >= 10) {
    hodnota = hodnota / 10
  }
  return Math.floor(hodnota)
}

// Rozdělí jeden řádek CSV na buňky a odstraní uvozovky
function rozdel_radek(radek: string): string[] {
  const bunky = radek.split(',')
  const vysledek: string[] = []
  for (let i = 0; i < bunky.length; i++) {
    let bunka = bunky[i].trim()
    bunka = bunka.replace(/"/g, '')
    vysledek.push(bunka)
  }
  return vysledek
}

function App() {
  const [csv_text, set_csv_text] = useState<string>('')
  const [hlavicka, set_hlavicka] = useState<string[]>([])
  const [radky, set_radky] = useState<string[][]>([])
  const [vybrany_sloupec, set_vybrany_sloupec] = useState<string>('')
  const [chyba, set_chyba] = useState<string>('')

  // Zpracuje text z CSV
  function nacti_csv(text: string) {
    set_chyba('')
    const vsechny_radky = text.split('\n')
    const nactene_radky: string[][] = []

    for (let i = 0; i < vsechny_radky.length; i++) {
      const radek = vsechny_radky[i].trim()
      if (radek !== '') {
        nactene_radky.push(rozdel_radek(radek))
      }
    }

    if (nactene_radky.length < 2) {
      set_chyba('CSV musí mít hlavičku a aspoň jeden řádek s daty')
      set_hlavicka([])
      set_radky([])
      return
    }

    const nova_hlavicka = nactene_radky[0]
    set_hlavicka(nova_hlavicka)
    set_radky(nactene_radky.slice(1))

    // Automaticky vybere sloupec price, kdyz existuje
    if (nova_hlavicka.includes('price')) {
      set_vybrany_sloupec('price')
    } else {
      set_vybrany_sloupec(nova_hlavicka[0])
    }
  }

  // Když uživatel nahraje soubor
  function nahrani_souboru(e: React.ChangeEvent<HTMLInputElement>) {
    const soubory = e.target.files
    if (soubory === null || soubory.length === 0) {
      return
    }
    const soubor = soubory[0]
    const ctecka = new FileReader()
    ctecka.onload = () => {
      const text = ctecka.result as string
      set_csv_text(text)
      nacti_csv(text)
    }
    ctecka.readAsText(soubor)
  }

  // Spočítáme kolikrat je jaká číslice na začátku
  const pocty_cislic: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  let celkem = 0
  const index_sloupce = hlavicka.indexOf(vybrany_sloupec)

  if (index_sloupce !== -1) {
    for (let i = 0; i < radky.length; i++) {
      const cislo = parseFloat(radky[i][index_sloupce])
      const cislice = prvni_cislice(cislo)
      if (cislice >= 1 && cislice <= 9) {
        pocty_cislic[cislice - 1] = pocty_cislic[cislice - 1] + 1
        celkem = celkem + 1
      }
    }
  }

  // Převedeme počty na procenta
  const procenta_dat: number[] = []
  for (let i = 0; i < 9; i++) {
    if (celkem > 0) {
      procenta_dat.push((pocty_cislic[i] / celkem) * 100)
    } else {
      procenta_dat.push(0)
    }
  }

  const data_grafu = {
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Data z CSV (%)',
        data: procenta_dat,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        type: 'line' as const,
        label: 'Benfordův zákon (%)',
        data: benford_procenta,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
      },
    ],
  }

  const nastaveni_grafu = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Četnost první číslice - sloupec: ' + vybrany_sloupec,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Procenta (%)' },
      },
      x: {
        title: { display: true, text: 'První číslice' },
      },
    },
  }

  return (
    <>
      <h1>Benfordův zákon</h1>
      <p className="popis">Data z trhu v Jitě (EVE Online). Benfordův zákon říká, že u spousty reálných dat začíná číslo jedničkou asi ve 30 % případů a devítkou jen asi ve 4,6 %.</p>
      <div className="box">
        <h2>1. Nahraj CSV soubor</h2>
        <input type="file" accept=".csv,text/csv" onChange={nahrani_souboru} />
        <h2>2. Nebo vlož CSV sem</h2>
        <textarea value={csv_text} onChange={(e) => set_csv_text(e.target.value)} placeholder={'"order_id","type_id","is_buy_order","price","volume_remain","volume_total"\n...'} rows={8}/>
        <button onClick={() => nacti_csv(csv_text)}>Načíst data</button>
        {chyba !== '' && <p className="chyba">{chyba}</p>}
      </div>

      {hlavicka.length > 0 && (
        <div className="box">
          <h2>3. Vyber sloupec</h2>
          <select value={vybrany_sloupec} onChange={(e) => set_vybrany_sloupec(e.target.value)}>
            {hlavicka.map((nazev) => (
              <option key={nazev} value={nazev}>
                {nazev}
              </option>
            ))}
          </select>
          <p>Načteno řádků: {radky.length}, použitých čísel: {celkem}</p>
          <div className="graf">
            <Chart type="bar" data={data_grafu} options={nastaveni_grafu} />
          </div>
          <table>
            <thead>
              <tr>
                <th>Číslice</th>
                <th>Počet</th>
                <th>Data (%)</th>
                <th>Benford (%)</th>
              </tr>
            </thead>
            <tbody>
              {pocty_cislic.map((pocet, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{pocet}</td>
                  <td>{procenta_dat[i].toFixed(1)}</td>
                  <td>{benford_procenta[i].toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default App