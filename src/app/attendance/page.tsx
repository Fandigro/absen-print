'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// GANTI DENGAN KOORDINAT TOKO PRINT-MU 
const STORE_LAT = -7.250444
const STORE_LONG = 112.768845
const MAX_DISTANCE = 50 // Meter (Toleransi jarak)
import { User } from '@supabase/supabase-js'

interface AttendanceRecord {
  id: number;
  user_id: string;
  created_at: string;
  status: string;
  latitude: number;
  longitude: number;
}

export default function AttendanceDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null) // Untuk user sementara biarkan any atau ganti ke User dari supabase
  const [history, setHistory] = useState<AttendanceRecord[]>([]) // Pakai interface tadi
  const [loading, setLoading] = useState(true)
  const [issubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      // 1. Cek apakah user sudah login
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/') // Balik ke login kalau belum ada session
        return
      }
      setUser(session.user)

      // 2. Ambil Riwayat Absen si user ini dari Supabase
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }) // Yang terbaru paling atas

      if (!error) setHistory(data)
      setLoading(false)
    }

    getData()
  }, [router])

  const handleAbsenSekarang = async () => {
    setIsSubmitting(true)

    // Ambil Lokasi GPS Browser
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      // Hitung Jarak (Rumus Haversine sederhana)
      const R = 6371e3
      const dLat = (STORE_LAT - lat) * Math.PI / 180
      const dLon = (STORE_LONG - lng) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(STORE_LAT * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      // Simpan data absen ke tabel 'attendance'
      const { error } = await supabase.from('attendance').insert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        status: dist <= MAX_DISTANCE ? 'Hadir' : 'Diluar Lokasi'
      })

      if (error) {
        alert("Gagal simpan absen: " + error.message)
      } else {
        alert("Absen Berhasil Dicatat!")
        window.location.reload() // Refresh biar list-nya update
      }
      setIsSubmitting(false)
    }, (err) => {
      alert("Wajib aktifkan GPS/Lokasi di browser ya!")
      setIsSubmitting(false)
    })
  }

  if (loading) return <div className="p-10 text-center font-bold">Memuat Dashboard...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">

        {/* Box Profil & Logout */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Karyawan</p>
            <h1 className="font-extrabold text-xl text-indigo-900">
              {user?.user_metadata?.full_name || 'User'}
            </h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-all"
          >
            LOGOUT
          </button>
        </div>

        {/* Tombol Absen Utama */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-50 text-center">
          <p className="text-sm text-gray-500 mb-4 font-medium">Klik saat kamu sudah di toko</p>
          <button
            onClick={handleAbsenSekarang}
            disabled={issubmitting}
            className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black text-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-gray-400"
          >
            {issubmitting ? 'CEK GPS...' : 'ABSEN SEKARANG'}
          </button>
        </div>

        {/* List Riwayat Absen */}
        <div className="space-y-4">
          <h2 className="font-black text-gray-800 text-lg px-1">Riwayat Absensi</h2>

          {history.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
              <p className="text-sm italic">Belum ada riwayat absen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-xl">
                      📍
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        Jam {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${item.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}