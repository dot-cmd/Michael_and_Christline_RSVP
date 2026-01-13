import { useEffect, useState } from "react";

/* ASSETS */
import flowerloading from "../assets/FLower Loading.png";
import logo from "../assets/logo.png";
import rsvptitle from "../assets/RSVP title.png";
import rsvplogo from "../assets/RSVP logo.png";
import end from "../assets/end.png";

/* GOOGLE APPS SCRIPT URL */
const API_URL =
  "https://script.google.com/macros/s/AKfycbxo-rm2EBRCmu5d0adfzQj37uW0786UR_ecmrxhNhGeJuuniZ5upwazBw-UX2Vri7d14Q/exec";

export default function Guest() {
  const [allNames, setAllNames] = useState([]);
  const [namesReady, setNamesReady] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [step, setStep] = useState("search");
  // search | confirm | invitees | thankyou | declined | loading

  const [allowed, setAllowed] = useState(0);
  const [invitees, setInvitees] = useState([]);

  const [slots, setSlots] = useState([]); // includes main guest as slot 0
  const [willGo, setWillGo] = useState(null);

  const [loading, setLoading] = useState(false);

  const [loadingSeats, setLoadingSeats] = useState(false);
  
  const [status, setStatus] = useState(null); // YES | NO | null
  const [guestCount, setGuestCount] = useState(0);

  

  const [query, setQuery] = useState("");
  const [guest, setGuest] = useState(null);

  const usedSlots = slots.length;
  const canAdd = usedSlots < allowed;

  const allFilled = slots.every(v => v && v.trim() !== "");

  const showUpdateRSVP =
  step === "search" &&
  !!guest &&
  (status === "YES" || status === "NO");

    
  const canClickRSVP =
  namesReady &&
  !loading &&
  !loadingSeats &&
  query.trim() &&
  guest;



  /* ---------- LOAD ALL NAMES ONCE ---------- */
  useEffect(() => {
    fetch(`${API_URL}?action=getNames`)
      .then((res) => res.json())
      .then((data) => {
        setAllNames(data || []);
        setNamesReady(true);
      })
      .catch(() => setNamesReady(true));
  }, []);
  /* ---------- LOAD ALL GUEST COUNTS ONCE ---------- */
  const [guestCounts, setGuestCounts] = useState({});
  useEffect(() => {
    async function fetchGuestCounts() {
      try {
        const res = await fetch(`${API_URL}?action=getAllGuestCounts`);
        const data = await res.json();
        console.log("Guest counts from sheet:", data); // <--- log here
        setGuestCounts(data || {});

        const totalGuests = Object.values(data || {}).reduce((sum, val) => sum + val, 0);
        console.log("Total guests (all invitees):", totalGuests); // <--- log here
        setGuestCount(totalGuests || 0);
      } catch (err) {
        console.error(err);
        setGuestCounts({});
        setGuestCount(0);
      }
    }

    fetchGuestCounts();
  }, []);





  /* ---------- fetch seats on name select ---------- */
  async function fetchAllowedSeats(name) {
    setLoadingSeats(true);

    try {
      const res = await fetch(
        `${API_URL}?action=getAllowed&name=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      setAllowed(data.allowed || 0);
    } catch {
      setAllowed(0);
    } finally {
      setLoadingSeats(false);
    }
  }


 

  /* ---------- RE-RUN FILTER WHEN DATA ARRIVES ---------- */
  useEffect(() => {
    if (namesReady && query) {
      filterSuggestions(query);
    }
  }, [namesReady]);

  /* ---------- AUTOCOMPLETE (INSTANT) ---------- */
  function filterSuggestions(text) {
    setQuery(text);
    setGuest(null);

    if (!text || !namesReady) {
      setSuggestions([]);
      return;
    }

    const q = text.toLowerCase();
    const matches = allNames
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 8);

    setSuggestions(matches);
  }

  /* ---------- SEARCH GUEST ---------- */
  async function searchGuest() {
    if (!guest) return;

    setLoading(true);
    setStep("loading"); // show loading indicator
    setSuggestions([]);

    try {
      const res = await fetch(`${API_URL}?action=searchGuest&name=${encodeURIComponent(guest)}`);
      const data = await res.json();

      if (!data.found) {
        alert("Guest not found");
        setStep("search");
        return;
      }

      // populate states
      setAllowed(data.allowed);
      setWillGo(data.willGo || null);
      setStatus(data.willGo || null); // ✅ ONLY HERE

      setInvitees(data.invitees?.length ? data.invitees : Array(data.allowed).fill(""));
      setSlots([
        guest, // slot 1 = main guest (locked)
        ...(data.invitees || [])
      ]);


      // decide next step
      setStep("confirm");
      
    } catch (err) {
      console.error(err);
      setStep("search");
    } finally {
      setLoading(false);
    }
  }


  function getStatusLabel() {
    if (status === "YES") return "ATTENDING";
    if (status === "NO") return "DECLINED";
    return "AWAITING RESPONSE";
  }

  async function fetchGuestData(name) {
    setLoadingSeats(true);

    try {
      const res = await fetch(`${API_URL}?action=searchGuest&name=${encodeURIComponent(name)}`);
      const data = await res.json();

      console.log("Selected guest data:", data); // <--- log the guest data

      if (!data.found) {
        alert("Guest not found");
        setStatus(null);
        setWillGo(null);
        setInvitees([]);
        setAllowed(0);
        return;
      }

      setStatus(data.status);
      setWillGo(data.status);
      setAllowed(data.allowed);
      setInvitees(data.invitees || []);
    } catch (err) {
      console.error(err);
      setStatus(null);
      setWillGo(null);
      setAllowed(0);
      setInvitees([]);
    } finally {
      setLoadingSeats(false);
    }
  }


  async function removeInvitees() {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "removeInvitees",
        guest,
      }),
    });
  }


  /* ---------- SAVE WILL GO ---------- */
  async function saveWillGoOnly(value) {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "setWillGo",
        guest,
        willGo: value,
      }),
    });
  }

  async function handleSave() {
    setLoading(true);

    if (willGo === "NO") {
      await saveWillGoOnly("NO");
      await removeInvitees();   // clears InvitedGuests row
      setLoading(false);
      setStep("Thankyou");
      return;
    }

    // YES
    await saveWillGoOnly("YES");
    setStep("Thankyou");

    // 🔥 VERY IMPORTANT
    // send ONLY additional guests (not main guest)
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveInvitees",
        guest,
        invitees: slots.slice(1), // 👈 correct source
      }),
    });


    setLoading(false);
    setStep("thankyou");
  }



  /* ---------- SAVE INVITEES ---------- */
  async function saveInvitees() {
    setLoading(true);
    setStep("loading");

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveInvitees",
        guest,
        invitees,
      }),
    });

    setLoading(false);
    setStep("thankyou");
  }

  /* ---------- LOADING = Flower Loading ONLY ---------- */
  if (loading || step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <img
            src={flowerloading}
            className="w-40 mx-auto animate-spinSlow"
            alt="Loading"
          />
        </div>
      </div>
    );
  }


  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="relative w-lg text-center bg-card p-10 rounded-3xl shadow-lg animate-fade-in">

        <img 
          src={rsvplogo} 
          className="absolute top-0 left-0 w-24 sm:w-32 md:w-40 lg:w-50 mb-4"
        />
        <img src={rsvptitle} className="mx-auto w-80" />
        <p className="font-serif text-sm">
          MAY 1, 2026   | ANDREYANNA’S GARDEN
        </p>

        {/* SEARCH */}
        {step === "search" && (
          <div className="relative flex flex-col items-center">
            <h1 className="text-2xl  mb-4 font-serif italic font-bold mt-7">
                  Please join us as we say “I Do”
            </h1>
            <p className="font-serif max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl">
              We have decided to celebrate a small and intimate wedding, surrounded only by those who hold the closest place in our hearts. Please RSVP on or before <span className="text-pink-500 font-bold">MARCH 30, 2026</span>. If we did not receive your confirmation, we will assume that you will not be able to join us and seat/s will be reallocated.
            </p>


            <p className="mt-4 mb-2 font-serif">
              Please search your name below to RSVP. If you cannot find your name, please contact us directly.
            </p>
            <div className="relative w-full lg:w-3/5">
              <input
                value={query}
                disabled={!namesReady}
                onChange={(e) => filterSuggestions(e.target.value)}
                placeholder={namesReady ? "Enter your full name here" : "Loading guest list…"}
                className="w-full rounded-full border px-4 py-1 disabled:opacity-50"
              />

              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 w-full bg-white rounded-xl shadow z-10 mt-1">
                  {suggestions.map((name) => (
                    <li
                      key={name}
                      onClick={() => {
                        setGuest(name);
                        setQuery(name);
                        setSuggestions([]);
                        fetchAllowedSeats(name);
                        setStatus(null);        // 🔥 force UPDATE hidden
                        setWillGo(null);
                        fetchGuestData(name);
                      }}
                      className="px-4 py-2 hover:bg-emerald-50 cursor-pointer"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>


            <h1 className="text-m font-serif mt-4 tracking-wide flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
              <span>WE HAVE RESERVED</span>
              
              <span className="underline text-lg font-bold min-w-[10px]">
                {loadingSeats ? (
                  <img
                    src={flowerloading}
                    alt="Loading"
                    className="inline-block w-20 pb-2 align-middle mx-auto animate-spinSlow"
                  />
                ) : (
                  allowed || "0"
                )}
              </span>

              <span>SEAT/S FOR YOU!</span>
            </h1>


            <div className="relative w-full lg:w-3/5">
              <div className="relative h-[44px] mt-3 flex items-center justify-center">
                {/* RSVP NOW */}
                <button
                  onClick={searchGuest}
                  disabled={!canClickRSVP}
                  className={`
                    absolute
                    w-fit bg-button font-bold font-serif py-2 px-5 rounded-2xl
                    transition-all duration-500
                    ${showUpdateRSVP ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"}
                    disabled:opacity-40
                  `}
                >
                  RSVP NOW
                </button>

                {/* UPDATE RSVP */}
                <button
                  onClick={searchGuest}
                  disabled={!canClickRSVP}
                  className={`
                    absolute
                    w-fit bg-updbutton font-bold font-serif py-2 px-5 rounded-2xl
                    transition-all duration-500
                    ${showUpdateRSVP ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-95"}
                    disabled:opacity-0
                  `}
                >
                  UPDATE RSVP
                </button>
              </div>



              <div className="flex flex-col items-start gap-1 font-serif font-bold text-sm mt-5 lg:absolute lg:-bottom-6 lg:-left-[150px]">
                <span>STATUS: {getStatusLabel()}</span>
                <span >
                  GUEST COUNT: <span className="text-xl ">{guestCount || "..."}</span> 
                </span>
              </div>
            </div>
          </div>
        )}

        {/* COMBINED CONFIRM + INVITEES – SINGLE CONTAINER */}
        {step === "confirm" && (
          <div
            className="w-full max-w-[670px] mx-auto p-6 rounded-3xl
             flex flex-col items-center animate-fadeIn"
          >
            {/* QUESTION */}
            <h2 className="text-xl font-serif mb-4 w-full mx-[120px] font-bold">
              WILL YOU BE ABLE TO ATTEND OUR WEDDING?
            </h2>

            {/* RADIO OPTIONS */}
            <div className="flex justify-center gap-8 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="willGo"
                  checked={willGo === "YES"}
                  onChange={() => setWillGo("YES")}
                  className="w-5 h-5 accent-emerald-700"
                />
                Yes
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="willGo"
                  checked={willGo === "NO"}
                  onChange={() => setWillGo("NO")}
                  className="w-5 h-5 accent-emerald-700"
                />
                No
              </label>
            </div>

            {/* INVITEES – EXPANDS DOWN */}
            <div
              className={`w-full overflow-hidden transition-all duration-700
                ${willGo ? "max-h-[800px] animate-slideUp" : "max-h-0"}
              `}
            >

              {willGo === "YES" && (
                <>
                  <p className="text-sm text-emerald-700 text-center mb-2">
                    Reserved Seats: {usedSlots}/{allowed}
                  </p>

                  {/* SLOTS */}
                  {slots.map((v, i) => (
                    <div key={i} className="w-full flex items-center gap-2 mb-2">
                      <input
                        value={v}
                        disabled={i === 0}
                        onChange={(e) => {
                          const copy = [...slots];
                          copy[i] = e.target.value;
                          setSlots(copy);
                        }}
                        placeholder={i === 0 ? "Main Guest" : `Guest ${i + 1}`}
                        className={`flex-1 border rounded-full px-4 py-2 ${
                          i === 0 ? "bg-gray-100" : ""
                        }`}
                      />

                      {i > 0 && (
                        <button
                          onClick={() => {
                            const copy = [...slots];
                            copy.splice(i, 1);
                            setSlots(copy);
                          }}
                          className="text-red-500 font-bold"
                        >
                          −
                        </button>
                      )}
                    </div>
                  ))}

                  {/* ADD BUTTON */}
                  {canAdd && (
                    <button
                      onClick={() => setSlots([...slots, ""])}
                      className="text-emerald-700 font-bold mt-2"
                    >
                      + Add Guest
                    </button>
                  )}

                </>
              )}
              {willGo === "NO" && (
                <>
                  <p className="text-lg font-serif mb-4">
                    Thank you for letting us know. You’ll be missed at the wedding, but we’ll carry your love with us as we say “I do”.
                  </p>
                  <p className="text-lg font-serif mb-2">
                    If your plans have changed, you may edit your RSVP on or before March 30, 2026.
                  </p>
                </>
              )}
            </div>

            {/* SAVE BUTTON – ALWAYS AT BOTTOM */}
            <button
              onClick={handleSave}
              disabled={
                !willGo ||
                (willGo === "YES" && !allFilled)
              }
              className="mt-5 w-11/12  bg-emerald-700 text-white py-2 rounded-full disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}




        {/* THANK YOU */}
        {step === "Thankyou" && (
          <div className="flex flex-col items-center max-w-[600px] mx-auto">

            <h2 className="text-xl font-serif italic mt-10">
              Your RSVP has been received — thank you! We are grateful for your love and blessings, near or far.
            </h2>
            <p className="mt-8 font-serif text-lg">
              You can return to this form anytime to update your response.
            </p>
            <p className="mt-7 font-serif text-lg -mb-3">
              With love,
            </p>
            <img src={end} className="w-60" />
          </div>
        )}

        <img src={logo} className="absolute right-1 -bottom-3  w-20 mb-4" />
      </div>
    </div>
  );
}
