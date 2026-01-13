import { useEffect, useState } from "react";

const API = "https://script.google.com/macros/s/AKfycbxo-rm2EBRCmu5d0adfzQj37uW0786UR_ecmrxhNhGeJuuniZ5upwazBw-UX2Vri7d14Q/exec";
const ADMIN_PASS = "chewy2026";

export default function Admin() {
  const [guests, setGuests] = useState([]);
  const [locked, setLocked] = useState(false);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    const pass = prompt("Admin password");
    if (pass === ADMIN_PASS) {
      setAuth(true);
      load();
    }
  }, []);

  const load = async () => {
    const res = await fetch(`${API}?action=getAll`);
    const data = await res.json();
    setGuests(data.guests);
    setLocked(data.locked);
  };

  const toggleLock = async () => {
    await fetch(API, {
      method: "POST",
      body: JSON.stringify({
        action: "updateMain",
        type: "lock",
        value: !locked,
      }),
    });
    setLocked(!locked);
  };

  const removeGuest = async (name) => {
    if (!confirm("Delete this guest?")) return;

    await fetch(API, {
      method: "POST",
      body: JSON.stringify({
        action: "updateMain",
        type: "remove",
        guest: name,
      }),
    });

    load();
  };

  if (!auth) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      <h1 className="text-3xl font-serif text-pink-600 mb-6">
        🌷 Admin Dashboard
      </h1>

      <button
        onClick={toggleLock}
        className={`mb-6 px-6 py-3 rounded-full text-white ${
          locked ? "bg-red-400" : "bg-green-400"
        }`}
      >
        {locked ? "RSVP CLOSED" : "RSVP OPEN"}
      </button>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-pink-100">
            <tr>
              <th className="p-3 text-left">Guest</th>
              <th className="p-3">Allowed</th>
              <th className="p-3">Invited</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{g.name}</td>
                <td className="p-3 text-center">{g.allowed}</td>
                <td className="p-3">
                  {g.invited.join(", ") || "—"}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => removeGuest(g.name)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
