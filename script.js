// script.js

function initializeAutocomplete(inputElement) {
    new google.maps.places.Autocomplete(inputElement);
  }
  
  function initializeMap(
    mapContainer,
    source = { lat: 47.3769, lng: 8.5417 },
    destination = null,
    travelMode = google.maps.TravelMode.DRIVING,
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
  
      directionsService.route(
        {
          origin: source,
          destination: destination,
          travelMode: travelMode,
          transitOptions: { departureTime: new Date() },
        },
        (response, status) => {
          if (status === "OK") {
            directionsRenderer.setDirections(response);
          } else {
            console.error("Directions request failed: " + status);
          }
        },
      );
    }
  }
  
  function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
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
    const details = {
      departure: "--",
      arrival: "--",
      travelTime: "--",
      waitingTime: "--",
      travelPlusWaiting: "--",
    };
    if (!legs || legs.length === 0) return details;
  
    const leg = legs[0];
    // Use 12-hour format with AM/PM
    details.departure = leg.departure_time 
      ? new Date(leg.departure_time.value).toLocaleTimeString([], { 
            hour: '2-digit', minute:'2-digit', hour12: true 
        }) 
      : "--";
    details.arrival = leg.arrival_time 
      ? new Date(leg.arrival_time.value).toLocaleTimeString([], { 
            hour: '2-digit', minute:'2-digit', hour12: true 
        }) 
      : "--";
  
    const travelSeconds = leg.duration ? leg.duration.value : 0;
    const travelMinutes = Math.round(travelSeconds / 60);
    details.travelTime = travelMinutes + " mins";
  
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
    let waitingMinutes = waitingSeconds > 0 ? Math.round(waitingSeconds / 60) : 0;
    details.waitingTime = waitingMinutes + " mins";
  
    let totalMinutes = travelMinutes + waitingMinutes;
    details.travelPlusWaiting = totalMinutes + " mins";
  
    return details;
  }
  
  async function calculateTravelTime(block) {
    // Clear previous details to prevent duplication
    const detailsDiv = block.querySelector(".details");
    detailsDiv.innerHTML = ""; 
  
    // Workday Calculation Logic
    const startDateElement = block.querySelector('.start-date');
    const endDateElement = block.querySelector('.end-date');
  
    if(startDateElement && endDateElement) {
      const startDate = new Date(startDateElement.value);
      const endDate = new Date(endDateElement.value);
      
      // Basic validation: Ensure startDate <= endDate
      if(isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
        console.error("Invalid start or end date.");
      } else {
        // Calculate total calendar days between dates (inclusive)
        const oneDay = 1000 * 60 * 60 * 24;
        const totalDays = Math.ceil((endDate - startDate) / oneDay) + 1;
        const daysInYear = 365; // approximation
        
        const workdays220 = Math.round((totalDays / daysInYear) * 220);
        const workdays240 = Math.round((totalDays / daysInYear) * 240);
        
        const days220Elem = block.querySelector('.days-220');
        const days240Elem = block.querySelector('.days-240');
        if(days220Elem) days220Elem.innerHTML = `Bei 220d p.a.: <strong>${workdays220} Tage</strong>`;
        if(days240Elem) days240Elem.innerHTML = `Bei 240d p.a.: <strong>${workdays240} Tage</strong>`;
      }
    }
  
    const homeAddress = block.querySelector(".homeAddress").value;
    const startWorkTime = block.querySelectorAll('input[type="time"]')[0].value;
    const endWorkTime = block.querySelectorAll('input[type="time"]')[1].value;
    const workAddress = block.querySelector(".employerAddress")
      ? block.querySelector(".employerAddress").value
      : "Rehaklinik Bellikon AG";
  
    try {
      const homeLocation = await geocodeAddress(homeAddress);
      const workLocation = await geocodeAddress(workAddress);
  
      // Create dedicated containers for each section
      let autoSection = document.createElement('div');
      autoSection.className = 'auto-section';
      detailsDiv.appendChild(autoSection);
  
      let ovSection = document.createElement('div');
      ovSection.className = 'ov-section';
      detailsDiv.appendChild(ovSection);
  
      let arbeitsbeginnSection = document.createElement('div');
      arbeitsbeginnSection.className = 'arbeitsbeginn-section';
      detailsDiv.appendChild(arbeitsbeginnSection);
  
      let arbeitsendeSection = document.createElement('div');
      arbeitsendeSection.className = 'arbeitsende-section';
      detailsDiv.appendChild(arbeitsendeSection);
  
      let carDurationMinutes = 0;
      let transitDurationMinutes = 0;
  
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
  
            const dailyTravelTime = (driveDuration * 2).toFixed(2) + " mins";
            const dailyDistance =
              (driveDistance * 2).toFixed(2) +
              " " +
              driveDistanceText.replace(/[0-9.]/g, "").trim();
  
            autoSection.innerHTML = `
              <h4>Auto</h4>
              <p>Auto Reisezeit: ${driveDurationText}</p>
              <p>Auto Reise in km: ${driveDistanceText}</p>
              <p>Auto Reisezeit am Tag: ${dailyTravelTime}</p>
              <p>Auto Reise in km am Tag: ${dailyDistance}</p>
            `;
            
            // Request for transit data to update ÖV section
            const transitServiceForOV = new google.maps.DirectionsService();
            transitServiceForOV.route(
              {
                origin: homeAddress,
                destination: workAddress,
                travelMode: google.maps.TravelMode.TRANSIT,
              },
              (ovResponse, ovStatus) => {
                if (ovStatus === "OK") {
                  const ovLeg = ovResponse.routes[0].legs[0];
                  const ovDurationText = ovLeg.duration.text;
                  const ovDistanceText = ovLeg.distance.text;
  
                  const ovDurationMatch = ovDurationText.match(/(\d+(\.\d+)?)/);
                  const ovDistanceMatch = ovDistanceText.match(/(\d+(\.\d+)?)/);
                  const ovDuration = ovDurationMatch ? parseFloat(ovDurationMatch[0]) : 0;
                  const ovDistance = ovDistanceMatch ? parseFloat(ovDistanceMatch[0]) : 0;
  
                  const dailyOVTravelTime = (ovDuration * 2).toFixed(2) + " mins";
                  const dailyOVDistance = (ovDistance * 2).toFixed(2) + " " + ovDistanceText.replace(/[0-9.]/g, "").trim();
  
                  ovSection.innerHTML = `
                    <h4>ÖV</h4>
                    <p>ÖV Reisezeit: ${ovDurationText}</p>
                    <p>ÖV Reise in km: ${ovDistanceText}</p>
                    <p>ÖV Reisezeit am Tag: ${dailyOVTravelTime}</p>
                    <p>ÖV Reise in km am Tag: ${dailyOVDistance}</p>
                  `;
                } else {
                  console.error("ÖV route request failed: " + ovStatus);
                }
              }
            );
  
            const transitService = new google.maps.DirectionsService();
            transitService.route(
              {
                origin: homeAddress,
                destination: workAddress,
                travelMode: google.maps.TravelMode.TRANSIT,
              },
              (transitResponse, transitStatus) => {
                if (transitStatus === "OK") {
                  const transitLeg = transitResponse.routes[0].legs[0];
                  const transitDurationSec = transitLeg.duration.value;
                  transitDurationMinutes = Math.round(transitDurationSec / 60);
  
                  const differenceMinutes = transitDurationMinutes - carDurationMinutes;
                  const threshold = 15; // Set your threshold here
                  const diffElement = block.querySelector('.difference');
                  if (diffElement) {
                    if(differenceMinutes > threshold) {
                      diffElement.textContent = `Weil die Dauer des ÖV um ${differenceMinutes} min länger ist.`;
                    } else {
                      diffElement.textContent = `Die Dauer des ÖV ist nur um ${differenceMinutes} min länger`;
                    }
                  }
                } else {
                  console.error("Transit route request failed: " + transitStatus);
                }
              }
            );
          } else {
            console.error("Driving route request failed: " + driveStatus);
          }
        }
      );
  
      const departureTimeStart = new Date();
      const [hoursStart, minutesStart] = startWorkTime.split(":").map(Number);
      departureTimeStart.setHours(hoursStart, minutesStart, 0, 0);
  
      const transitServiceStart = new google.maps.DirectionsService();
      transitServiceStart.route(
        {
          origin: homeAddress,
          destination: workAddress,
          travelMode: google.maps.TravelMode.TRANSIT,
          transitOptions: { departureTime: departureTimeStart },
        },
        (transitResponseStart, transitStatusStart) => {
          if (transitStatusStart === "OK") {
            const legsStart = transitResponseStart.routes[0].legs;
            const transitDetailsStart = extractTransitDetails(legsStart);
            arbeitsbeginnSection.innerHTML = `
              <h4>ÖV Zeiten Arbeitsbeginn</h4>
              <p>Abreise: ${transitDetailsStart.departure}</p>
              <p>Ankunft: ${transitDetailsStart.arrival}</p>
              <p>Reisezeit: ${transitDetailsStart.travelTime}</p>
              <p>Warten: ${transitDetailsStart.waitingTime}</p>
              <p>Reisezeit + Warten: ${transitDetailsStart.travelPlusWaiting}</p>
            `;
          } else {
            console.error(
              "Transit route request failed (Start): " + transitStatusStart,
            );
          }
        },
      );
  
      const departureTimeEnd = new Date();
      const [hoursEnd, minutesEnd] = endWorkTime.split(":").map(Number);
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
            arbeitsendeSection.innerHTML = `
              <h4>ÖV Zeiten Arbeitsende</h4>
              <p>Abreise: ${transitDetailsEnd.departure}</p>
              <p>Ankunft: ${transitDetailsEnd.arrival}</p>
              <p>Reisezeit: ${transitDetailsEnd.travelTime}</p>
              <p>Warten: ${transitDetailsEnd.waitingTime}</p>
              <p>Reisezeit + Warten: ${transitDetailsEnd.travelPlusWaiting}</p>
            `;
          } else {
            console.error(
              "Transit route request failed (End): " + transitStatusEnd,
            );
          }
        },
      );
  
      const mapContainer = block.querySelector(".map");
      initializeMap(
        mapContainer,
        homeLocation,
        workLocation,
        google.maps.TravelMode.DRIVING,
      );
    } catch (error) {
      console.error("Error during calculation:", error);
    }
  }
  
  function setupCalculationBlock(block) {
    const homeAddressInput = block.querySelector(".homeAddress");
    initializeAutocomplete(homeAddressInput);
  
    const employerAddressInput = block.querySelector(".employerAddress");
    if (employerAddressInput) {
      initializeAutocomplete(employerAddressInput);
    }
  
    const mapContainer = block.querySelector(".map");
    initializeMap(mapContainer);
  
    const calculateBtn = block.querySelector(".calculate-button");
    // Remove any existing event listeners to avoid duplication
    calculateBtn.replaceWith(calculateBtn.cloneNode(true));
    block.querySelector(".calculate-button").addEventListener("click", () => {
      calculateTravelTime(block);
    });
  }
  
  document.querySelectorAll(".calculation-block").forEach((block) => {
    setupCalculationBlock(block);
  });
  
  // Add More Button functionality 
  document.querySelector('.add-button').addEventListener('click', () => {
    const mainContainer = document.getElementById('main-container');
    const originalBlock = document.querySelector('.calculation-block');
  
    const newBlock = originalBlock.cloneNode(true);
  
    newBlock.querySelectorAll('input').forEach((input) => {
      if (input.type === 'text' || input.type === 'time' || input.type === 'date') {
        input.value = ''; 
      }
    });
  
    const resultsDiv = newBlock.querySelector('.results');
    const detailsDiv = newBlock.querySelector('.details');
  
    resultsDiv.innerHTML = `
      <div>
        <p><strong>Abzug:</strong> Der Abzug ist möglich.</p>
        <p class="difference"></p>
      </div>
      <div>
        <p class="days-220">Bei 220d p.a.: <strong></strong></p>
        <p class="days-240">Bei 240d p.a.: <strong></strong></p>
      </div>
    `;
  
    detailsDiv.innerHTML = `
      <div class="auto-section">
        <h4>Auto</h4>
        <p>Auto Reisezeit: -- Minuten</p>
        <p>Auto Reise in km: -- km</p>
        <p>Auto Reisezeit am Tag: -- Minuten</p>
        <p>Auto Reise in km am Tag: -- km</p>
      </div>
      <div class="ov-section">
        <h4>ÖV</h4>
        <p>ÖV Reisezeit: -- Minuten</p>
        <p>ÖV Reise in km: -- km</p>
        <p>ÖV Reisezeit am Tag: -- Minuten</p>
        <p>ÖV Reise in km am Tag: -- km</p>
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
  
    mainContainer.insertBefore(newBlock, document.querySelector('.add-button'));
  
    setupCalculationBlock(newBlock);
  });
  