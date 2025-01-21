const holidays = [
  "2023-01-02",
  "2023-04-10",
  "2023-05-01",
  "2023-05-29",
  "2023-09-18",
  "2023-12-25",
  "2024-01-01",
  "2024-01-02",
  "2024-04-01",
  "2024-04-08",
  "2024-05-20",
  "2024-09-16",
  "2024-12-25",
  "2025-01-01",
  "2025-01-02",
  "2025-04-21",
  "2025-06-09",
  "2025-09-15",
  "2025-12-08",
];

function isSwissHoliday(date) {
  // Format the date to YYYY-MM-DD to match the holidays array.
  const formattedDate = date.toISOString().split("T")[0];
  return holidays.includes(formattedDate);
}

function getDaysInYear(year) {
  // A year is a leap year if it's divisible by 400 or (divisible by 4 but not by 100)
  if (year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)) {
    return 366;
  }
  return 365;
}

function getNextValidMonday() {
  let date = new Date();
  // Move the date one month ahead.
  date.setMonth(date.getMonth() + 1);
  // Loop until we find a Monday (getDay() === 1) that is not a holiday.
  while (date.getDay() !== 1 || isSwissHoliday(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split("T")[0];
}

function getDateOneMonthLater() {
  let date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split("T")[0];
}

function initializeAutocomplete(inputElement) {
  new google.maps.places.Autocomplete(inputElement);
}

function initializeMap(
  mapContainer,
  source = { lat: 47.3769, lng: 8.5417 },
  destination = null,
  travelMode = google.maps.TravelMode.DRIVING
) {
  const map = new google.maps.Map(mapContainer, {
    zoom: 14,
    center: source,
  });

  if (destination) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      polylineOptions: { strokeColor: "blue" },
    });

    // Make a route request from source to destination.
    directionsService.route(
      {
        origin: source,
        destination: destination,
        travelMode: travelMode,
        // Use current time as departureTime for transit services if needed.
        transitOptions: {
          departureTime: new Date(document.querySelector(".startTime").value),
        },
      },
      (response, status) => {
        if (status === "OK") {
          // Render directions on the map if the request was successful.
          directionsRenderer.setDirections(response);
        } else {
          console.error("Directions request failed: " + status);
        }
      }
    );
  }
}

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    // Attempt to geocode the given address.
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
        resolve(results[0].geometry.location);
      } else {
        reject("Geocode failed: " + status);
      }
    });
  });
}

function extractTransitDetails(legs) {
  // Initialize default details.
  const details = {
    departure: "--",
    arrival: "--",
    travelTime: "--",
    waitingTime: "--",
    travelPlusWaiting: "--",
  };
  // If no legs available, return default details.
  if (!legs || legs.length === 0) return details;

  // Use the first leg for calculations.
  const leg = legs[0];
  // Format departure time if available.
  details.departure = leg.departure_time
    ? new Date(leg.departure_time.value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--";
  // Format arrival time if available.
  details.arrival = leg.arrival_time
    ? new Date(leg.arrival_time.value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--";

  // Calculate travel time in minutes.
  const travelSeconds = leg.duration ? leg.duration.value : 0;
  const travelMinutes = Math.round(travelSeconds / 60);
  details.travelTime = travelMinutes + " mins";

  // Sum up transit durations from individual steps.
  let totalDuration = leg.duration ? leg.duration.value : 0;
  let sumTransitDuration = 0;
  if (leg.steps) {
    leg.steps.forEach((step) => {
      if (step.travel_mode === "TRANSIT") {
        sumTransitDuration += step.duration ? step.duration.value : 0;
      }
    });
  }
  // Calculate waiting time as the difference between total and sum of transit durations.
  let waitingSeconds = totalDuration - sumTransitDuration;
  let waitingMinutes = waitingSeconds > 0 ? Math.round(waitingSeconds / 60) : 0;
  details.waitingTime = waitingMinutes + " mins";

  // Sum travel time and waiting time.
  let totalMinutes = travelMinutes + waitingMinutes;
  details.travelPlusWaiting = totalMinutes + " mins";

  return details;
}

// Once the DOM is fully loaded, set the global date input to one month later.
document.addEventListener("DOMContentLoaded", () => {
  const globalDateInput = document.getElementById("globalDate");
  if (globalDateInput) {
    globalDateInput.value = getDateOneMonthLater();
  }
});

async function calculateTravelTime(block) {
  // Clear previous details output.
  const detailsDiv = block.querySelector(".details");
  detailsDiv.innerHTML = "";

  const globalDateInput = document.getElementById("globalDate");
  let selectedDateStr = globalDateInput ? globalDateInput.value : null;
  let selectedDate = selectedDateStr ? new Date(selectedDateStr) : new Date();

  if (isSwissHoliday(selectedDate)) {
    console.log(
      "The selected global date is a holiday. Switching to the next valid Monday."
    );
    const nextMondayStr = getNextValidMonday();
    selectedDate = new Date(nextMondayStr);
    console.log("Next valid Monday:", nextMondayStr);
    // Update the globalDate input field to reflect the new date.
    if (globalDateInput) {
      globalDateInput.value = nextMondayStr;
    }
  } else {
    console.log("The selected global date is not a holiday.");
  }

  const yearOfSelectedDate = selectedDate.getFullYear();
  const daysInYearForSelectedDate = getDaysInYear(yearOfSelectedDate);

  const startDateElement = block.querySelector(".start-date");
  const endDateElement = block.querySelector(".end-date");

  if (startDateElement && endDateElement) {
    const startDate = new Date(startDateElement.value);
    const endDate = new Date(endDateElement.value);

    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      console.error("Invalid start or end date.");
    } else {
      const oneDay = 1000 * 60 * 60 * 24;
      const totalDays = Math.ceil((endDate - startDate) / oneDay) + 1;

      const workdays220 = Math.round(
        (totalDays / daysInYearForSelectedDate) * 220
      );
      const workdays240 = Math.round(
        (totalDays / daysInYearForSelectedDate) * 240
      );

      const days220Elem = block.querySelector(".days-220");
      const days240Elem = block.querySelector(".days-240");
      if (days220Elem)
        days220Elem.innerHTML = `Bei 220d p.a.: <strong>${workdays220} Tage</strong>`;
      if (days240Elem)
        days240Elem.innerHTML = `Bei 240d p.a.: <strong>${workdays240} Tage</strong>`;
    }
  }

  const homeAddress = block.querySelector(".homeAddress").value;
  const startWorkTime = block.querySelector(".startTime").value || "07:30";
  const endWorkTime = block.querySelector(".endTime").value || "17:30";
  const workAddress = block.querySelector(".employerAddress")
    ? block.querySelector(".employerAddress").value
    : "";

  try {
    const homeLocation = await geocodeAddress(homeAddress);
    const workLocation = await geocodeAddress(workAddress);

    let autoSection = document.createElement("div");
    autoSection.className = "auto-section";
    detailsDiv.appendChild(autoSection);

    let ovSection = document.createElement("div");
    ovSection.className = "ov-section";
    detailsDiv.appendChild(ovSection);

    let arbeitsbeginnSection = document.createElement("div");
    arbeitsbeginnSection.className = "arbeitsbeginn-section";
    detailsDiv.appendChild(arbeitsbeginnSection);

    let arbeitsendeSection = document.createElement("div");
    arbeitsendeSection.className = "arbeitsende-section";
    detailsDiv.appendChild(arbeitsendeSection);

    ovSection.innerHTML = `<h4>ÖV</h4>
      <p>Anfahrt + Wartezeit (Arbeitsbeginn): -- Minuten</p>
      <p>Rückfahrt + Wartezeit (Arbeitsende): -- Minuten</p>
      <p>Gesamte ÖV-Zeit + Wartezeit am Tag: -- Minuten</p>
      <p>ÖV vs. Auto: Zeitunterschied: -- Minuten</p>
      `;

    let carDurationMinutes = 0;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: homeAddress,
        destination: workAddress,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (driveResponse, driveStatus) => {
        if (driveStatus === "OK") {
          const driveLeg = driveResponse.routes[0].legs[0];
          const driveDurationSec = driveLeg.duration.value;
          carDurationMinutes = Math.round(driveDurationSec / 60);

          const driveDistanceText = driveLeg.distance.text;
          const driveDurationText = driveLeg.duration.text;

          const driveDurationMatch = driveDurationText.match(/(\d+(\.\d+)?)/);
          const driveDistanceMatch = driveDistanceText.match(/(\d+(\.\d+)?)/);
          const driveDuration = driveDurationMatch
            ? parseFloat(driveDurationMatch[0])
            : 0;
          const driveDistance = driveDistanceMatch
            ? parseFloat(driveDistanceMatch[0])
            : 0;

          const dailyTravelTime = Math.round(driveDuration * 2) + " mins";
          const dailyDistance =
            (driveDistance * 2).toFixed(2) +
            " " +
            driveDistanceText.replace(/[0-9.]/g, "").trim();

          autoSection.innerHTML = `<h4>Auto</h4>
            <p>Auto Reisezeit: ${driveDurationText}</p>
            <p>Auto Reise in km: ${driveDistanceText}</p>
            <p>Auto Reisezeit am Tag: ${dailyTravelTime}</p>
            <p>Auto Reise in km am Tag: ${dailyDistance}</p>
            `;

          const transitServiceForOV = new google.maps.DirectionsService();
          transitServiceForOV.route(
            {
              origin: homeAddress,
              destination: workAddress,
              travelMode: google.maps.TravelMode.TRANSIT,
            },
            (ovResponse, ovStatus) => {
              if (ovStatus === "OK") {
              } else {
                console.error("ÖV route request failed: " + ovStatus);
              }
            }
          );
        } else {
          console.error("Driving route request failed: " + driveStatus);
        }
      }
    );

    const departureTimeStart = new Date(
      document.querySelector("#globalDate").value
    );
    const [hoursStart, minutesStart] = startWorkTime.split(":").map(Number);
    departureTimeStart.setHours(hoursStart, minutesStart, 0, 0);

    const transitServiceStart = new google.maps.DirectionsService();
    transitServiceStart.route(
      {
        origin: homeAddress,
        destination: workAddress,
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: {
          arrivalTime: departureTimeStart,
        },
      },
      (transitResponseStart, transitStatusStart) => {
        if (transitStatusStart === "OK") {
          const legsStart = transitResponseStart.routes[0].legs;
          console.log("Data comming from Google API", transitResponseStart);
          const transitDetailsStart = extractTransitDetails(legsStart);

          // If no legs returned, exit early.
          if (!legsStart || legsStart.length === 0) return null;

          // Use the first leg for direct time extraction.
          const leg = legsStart[0];
          const departure = leg.departure_time
            ? new Date(leg.departure_time.value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "--";
          const arrival = leg.arrival_time
            ? new Date(leg.arrival_time.value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "--";

          const travelSeconds = leg.duration ? leg.duration.value : 0;
          const travelMinutes = Math.round(travelSeconds / 60);
          const travelTime = travelMinutes + " mins";

          let totalDuration = leg.duration ? leg.duration.value : 0;
          let sumTransitDuration = 0;
          if (leg.steps) {
            leg.steps.forEach((step) => {
              if (step.travel_mode === "TRANSIT") {
                sumTransitDuration += step.duration ? step.duration.value : 0;
              }
            });
          }
          let waitingSeconds = totalDuration - sumTransitDuration;
          let waitingMinutes =
            waitingSeconds > 0 ? Math.round(waitingSeconds / 60) : 0;
          const waitingTime = waitingMinutes + " mins";

          let totalMinutes = travelMinutes + waitingMinutes;
          const travelPlusWaiting = totalMinutes + " mins";

          // Update section for 'Arbeitsbeginn' (start of work) times and details.
          arbeitsbeginnSection.innerHTML = `<h4>ÖV Zeiten Arbeitsbeginn</h4>
            <p>Abreise: ${departure}</p>
            <p>Ankunft: ${arrival}</p>
            <p>Reisezeit: ${travelTime}</p>
            <p>Warten: ${waitingTime}</p>
            <p>Reisezeit + Warten: ${travelPlusWaiting}</p>
            `;
          // Update first paragraph of OV section with travel plus waiting time.
          const ovParagraphs = ovSection.querySelectorAll("p");
          if (ovParagraphs.length >= 4) {
            ovParagraphs[0].textContent = `Anfahrt + Wartezeit (Arbeitsbeginn): ${travelPlusWaiting}`;
          }
        } else {
          console.error(
            "Transit route request failed (Start): " + transitStatusStart
          );
        }
      }
    );

    const departureTimeEnd = new Date(
      document.querySelector("#globalDate").value
    );
    const [hoursEnd, minutesEnd] = endWorkTime.split(":").map(Number);
    console.log("startWorkTime", startWorkTime);
    console.log("endWorkTime", endWorkTime);
    departureTimeEnd.setHours(hoursEnd, minutesEnd, 0, 0);

    const transitServiceEnd = new google.maps.DirectionsService();
    transitServiceEnd.route(
      {
        origin: workAddress,
        destination: homeAddress,
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: { departureTime: departureTimeEnd },
      },
      (transitResponseEnd, transitStatusEnd) => {
        if (transitStatusEnd === "OK") {
          const legsEnd = transitResponseEnd.routes[0].legs;
          const transitDetailsEnd = extractTransitDetails(legsEnd);
          if (!legsEnd || legsEnd.length === 0) return;

          const leg = legsEnd[0];
          const departure = leg.departure_time
            ? new Date(leg.departure_time.value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "--";
          const arrival = leg.arrival_time
            ? new Date(leg.arrival_time.value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "--";

          const travelSeconds = leg.duration ? leg.duration.value : 0;
          const travelMinutes = Math.round(travelSeconds / 60);
          const travelTime = travelMinutes + " mins";

          let totalDuration = leg.duration ? leg.duration.value : 0;
          let sumTransitDuration = 0;
          if (leg.steps) {
            leg.steps.forEach((step) => {
              if (step.travel_mode === "TRANSIT") {
                sumTransitDuration += step.duration ? step.duration.value : 0;
              }
            });
          }
          let waitingSeconds = totalDuration - sumTransitDuration;
          let waitingMinutes =
            waitingSeconds > 0 ? Math.round(waitingSeconds / 60) : 0;
          const waitingTime = waitingMinutes + " mins";

          let totalMinutes = travelMinutes + waitingMinutes;
          const travelPlusWaiting = totalMinutes + " mins";

          arbeitsendeSection.innerHTML = `<h4>ÖV Zeiten Arbeitsende</h4>
            <p>Abreise: ${departure}</p>
            <p>Ankunft: ${arrival}</p>
            <p>Reisezeit: ${travelTime}</p>
            <p>Warten: ${waitingTime}</p>
            <p>Reisezeit + Warten: ${travelPlusWaiting} end time</p>
            `;
          const ovParagraphs = ovSection.querySelectorAll("p");
          if (ovParagraphs.length >= 4) {
            ovParagraphs[1].textContent = `Rückfahrt + Wartezeit (Arbeitsende): ${transitDetailsEnd.travelPlusWaiting}`;

            const anfahrtText =
              ovParagraphs[0].textContent.match(/(\d+)/)?.[0] || "0";
            const rueckfahrtText =
              ovParagraphs[1].textContent.match(/(\d+)/)?.[0] || "0";

            const anfahrtMinutes = parseInt(anfahrtText);
            const rueckfahrtMinutes = parseInt(rueckfahrtText);
            const gesamteOV = anfahrtMinutes + rueckfahrtMinutes;
            ovParagraphs[2].textContent = `Gesamte ÖV-Zeit + Wartezeit am Tag: ${gesamteOV} mins`;

            const autoZeitText =
              block.querySelector(".auto-section p:nth-of-type(3)")
                ?.textContent || "";
            const autoZeitMatch = autoZeitText.match(/(\d+)/);
            const autoZeit = autoZeitMatch ? parseInt(autoZeitMatch[0]) : 0;

            const zeitunterschied = gesamteOV - autoZeit;
            ovParagraphs[3].textContent = `ÖV vs. Auto: Zeitunterschied: ${zeitunterschied} mins`;

            const diffElement = block.querySelector(".difference");
            const abzugElement = block.querySelector(".abzug");
            if (diffElement && abzugElement) {
              if (zeitunterschied > 90) {
                abzugElement.innerHTML = "<strong>Abzug:</strong> Ist möglich.";
                diffElement.style.color = "green";
                diffElement.textContent = `Weil die Dauer des ÖV um ${zeitunterschied} min länger dauert.`;
              } else if (zeitunterschied > 60) {
                abzugElement.innerHTML =
                  "<strong>Abzug:</strong> Ist wahrscheinlich möglich.";
                diffElement.style.color = "orange";
                diffElement.textContent = `Weil die Dauer des ÖV um ${zeitunterschied} min länger dauert.`;
              } else {
                abzugElement.innerHTML =
                  "<strong>Abzug:</strong> Ist nicht möglich.";
                diffElement.style.color = "red";
                diffElement.textContent = `Weil die Dauer des ÖV nur um ${zeitunterschied} min länger dauert.`;
              }
            }
          }
        } else {
          console.error(
            "Transit route request failed (End): " + transitStatusEnd
          );
        }
      }
    );

    // Initialize and display the map in the current block.
    const mapContainer = block.querySelector(".map");
    initializeMap(
      mapContainer,
      homeLocation,
      workLocation,
      google.maps.TravelMode.DRIVING
    );
  } catch (error) {
    console.error("Error during calculation:", error);
  }
}

function setupCalculationBlock(block) {
  // Initialize autocomplete fields for home and employer addresses.
  const homeAddressInput = block.querySelector(".homeAddress");
  if (homeAddressInput) initializeAutocomplete(homeAddressInput);

  const employerAddressInput = block.querySelector(".employerAddress");
  if (employerAddressInput) {
    initializeAutocomplete(employerAddressInput);
  }

  // Set default start and end times.
  const startTimeInput = block.querySelector(".startTime");
  const endTimeInput = block.querySelector(".endTime");
  if (startTimeInput) startTimeInput.value = "07:30";
  if (endTimeInput) endTimeInput.value = "17:30";

  // If there's only one calculation block, auto-fill the date range to the previous year.
  if (document.querySelectorAll(".calculation-block").length === 1) {
    const startDateInput = block.querySelector(".start-date");
    const endDateInput = block.querySelector(".end-date");
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    if (startDateInput) startDateInput.value = `${lastYear}-01-01`;
    if (endDateInput) endDateInput.value = `${lastYear}-12-31`;
  }

  // Initialize the map with default settings.
  const mapContainer = block.querySelector(".map");
  initializeMap(mapContainer);

  // Setup calculate button: clone node to remove existing listeners, then add new listener.
  const calculateBtn = block.querySelector(".calculate-button");
  calculateBtn.replaceWith(calculateBtn.cloneNode(true));
  block.querySelector(".calculate-button").addEventListener("click", () => {
    calculateTravelTime(block);
  });
}

// Array to hold all calculation block elements.
const calculationBlocks = [];
let currentPageIndex = 0;

function showBlock(index) {
  calculationBlocks.forEach((block, i) => {
    block.style.display = i === index ? "" : "none";
  });
  currentPageIndex = index;
}

function updatePagination() {
  const paginationDiv = document.querySelector(".pagination");
  paginationDiv.innerHTML = "";

  // Create a button for each calculation block page.
  calculationBlocks.forEach((_, index) => {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = index + 1;
    pageBtn.className = "page-btn";
    // Highlight the active page button.
    if (index === currentPageIndex) {
      pageBtn.classList.add("active");
    }
    // Add click listener to navigate to selected page.
    pageBtn.addEventListener("click", () => {
      showBlock(index);
      updatePagination();
    });
    paginationDiv.appendChild(pageBtn);
  });
}

// Collect all elements with class 'calculation-block' and initialize them.
document.querySelectorAll(".calculation-block").forEach((block) => {
  calculationBlocks.push(block);
  setupCalculationBlock(block);
});

// Show the first block initially if available.
if (calculationBlocks.length > 0) {
  showBlock(0);
}

// Listener for adding a new calculation block when the "add" button is clicked.
document.querySelector(".add-button").addEventListener("click", () => {
  const mainContainer = document.getElementById("main-container");
  // Clone the first calculation block as a template.
  const newBlock = document.querySelector(".calculation-block").cloneNode(true);

  // Reset input values for text, time, and date fields in the new block.
  newBlock.querySelectorAll("input").forEach((input) => {
    if (
      input.type === "text" ||
      input.type === "time" ||
      input.type === "date"
    ) {
      if (input.classList.contains("startTime")) {
        input.value = "07:30";
      } else if (input.classList.contains("endTime")) {
        input.value = "17:30";
      } else {
        input.value = "";
      }
    }
  });

  // Reset results and details sections to initial placeholders.
  const resultsDiv = newBlock.querySelector(".results");
  const detailsDiv = newBlock.querySelector(".details");

  resultsDiv.innerHTML = `<div>
      <p class="abzug"><strong>Abzug:</strong> Der Abzug ist möglich.</p>
      <p class="difference"></p>
    </div>
    <div>
      <p class="days-220">Bei 220d p.a.: <strong></strong></p>
      <p class="days-240">Bei 240d p.a.: <strong></strong></p>
    </div>
    `;

  detailsDiv.innerHTML = `<div class="auto-section">
      <h4>Auto</h4>
      <p>Auto Reisezeit: -- Minuten</p>
      <p>Auto Reise in km: -- km</p>
      <p>Auto Reisezeit am Tag: -- Minuten</p>
      <p>Auto Reise in km am Tag: -- km</p>
    </div>
    <div class="ov-section">
      <h4>ÖV</h4>
      <p>Anfahrt + Wartezeit (Arbeitsbeginn): -- Minuten</p>
      <p>Rückfahrt + Wartezeit (Arbeitsende): -- Minuten</p>
      <p>Gesamte ÖV-Zeit + Wartezeit am Tag: -- Minuten</p>
      <p>ÖV vs. Auto: Zeitunterschied: -- Minuten</p>
    </div>
    <div class="arbeitsbeginn-section">
      <h4>ÖV Zeiten Arbeitsbeginn</h4>
      <p>Abreise: -- Uhr</p>
      <p>Ankunft: -- Uhr</p>
      <p>Reisezeit: -- Minuten</p>
      <p>Warten: -- Minuten</p>
      <p>Reisezeit + Warten: -- Minuten</p>
    </div>
    <div class="arbeitsende-section">
      <h4>ÖV Zeiten Arbeitsende</h4>
      <p>Abreise: -- Uhr</p>
      <p>Ankunft: -- Uhr</p>
      <p>Reisezeit: -- Minuten</p>
      <p>Warten: -- Minuten</p>
      <p>Reisezeit + Warten: -- Minuten</p>
    </div>
    `;

  // Insert the new block before the pagination container.
  mainContainer.insertBefore(
    newBlock,
    document.querySelector(".pagination-container")
  );
  // Setup new block behaviors and add it to our collection.
  setupCalculationBlock(newBlock);
  calculationBlocks.push(newBlock);

  // Show the newly added block and update pagination.
  showBlock(calculationBlocks.length - 1);
  updatePagination();
});
