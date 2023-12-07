
'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.button');
const none = document.querySelector('.none');
// let map, mapEvent;
const coord = [33.51, 36.3]

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10)
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()} `
    }
    click() {
        this.clicks++;
    }

}
class Running extends Workout {
    type = 'running'
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance
        return this.pace
    }

}
class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        // this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / this.duration;
        return this.speed
    }
}


///////////////////////////////////////////
////

class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoom = 13;

    constructor() {
        this._loadMap();
        this._getLocalStorage();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField)
        containerWorkouts.addEventListener('click', this._moveToPop.bind(this))
        deleteAll.addEventListener('click', this._clearAllWorkouts.bind(this))

    }


    _loadMap() {
        this.#map = L.map('map').setView(coord, this.#mapZoom);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));
        this.#workouts.forEach(w => {
            this._renderWorkoutMarker(w)
        })

        // استعادة حالة الزر من التخزين المحلي
        const buttonState = localStorage.getItem('buttonState');
        if (buttonState) {
            none.style.display = buttonState;
        }
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _newWorkout(e) {
        e.preventDefault();
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp))
        const allPositive = (...inputs) => inputs.every(inp => inp > 0)

        //get the data
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;
        // let workoutElement;

        //if running 
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('inputs have to be a positive number!');

            workout = new Running([lat, lng], distance, duration, cadence)
        }
        //if cycling 
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInput(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('inputs have to be a positive number!')

            workout = new Cycling([lat, lng], distance, duration, elevation)
        }


        //add new object
        this.#workouts.push(workout)

        //render marker
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);
        //hide form

        this._hideForm();
        //set local storage
        this._setLocal();

        this._checkWorkoutsAndToggleButton()
    }
    _renderWorkoutMarker(workout) {
        let marker = L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴🏻‍♀️'
                }${workout.description}`)
            .openPopup();

        marker.on('popupclose', this._deleteWorkout.bind(this, marker, workout)); // pass both marker and workout



    }
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
        <span class="workout__icon">${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴🏻‍♀️'
            }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
              </div>
            <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
            `;

        // let workoutElement = document.querySelector(`#${workout.id}`);

        if (workout.type === 'running')
            html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">👣</span>
        <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

        if (workout.type === 'cycling')
            html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">🌄</span>
        <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

        form.insertAdjacentHTML('afterend', html);
    }
    // Accept the marker as a parameter to the _deleteWorkout() method
    _deleteWorkout(marker, workout) {
        const workoutElement = document.querySelector(`li[data-id="${workout.id}"]`);
        if (!workoutElement) {
            // Workout element does not exist, so do nothing
            return;
        }

        marker.remove();
        // Remove the workout element from the list
        workoutElement.remove();

        // Remove the workout from the array
        this.#workouts = this.#workouts.filter(work => work.id !== workout.id);

        // Remove the workout from local storage
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
        this._checkWorkoutsAndToggleButton();
    }



    _moveToPop(e) {
        // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
        if (!this.#map) return;

        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );

        this.#map.setView(workout.coords, this.#mapZoom, {
            animate: true,
            pan: {
                duration: 1,
            },
        });


    }
    _setLocal() {
        // Convert the array of workout objects to a JSON string
        const workoutsJson = JSON.stringify(this.#workouts, null, 2);

        // Store the JSON string in local storage
        localStorage.setItem('workouts', workoutsJson);
    }


    // Add the _getLocalStorage() method
    _getLocalStorage() {
        // Retrieve the JSON string from local storage
        const workoutsJson = localStorage.getItem('workouts');

        // Check if workoutsJson is null
        if (workoutsJson === null) {
            // No stored workouts, so initialize the array and skip rendering
            this.#workouts = [];
            return;
        }

        // Parse the JSON string into an array of workout objects
        const workouts = JSON.parse(workoutsJson);

        // Update the internal array of workouts
        this.#workouts = workouts;

        // Re-render the markers and workout elements
        workouts.forEach(w => {
            this._renderWorkoutMarker(w);
            this._renderWorkout(w);
        });
    }

    _checkWorkoutsAndToggleButton() {
        const workoutCount = this.#workouts.length;

        if (workoutCount > 0) {
            none.style.display = 'block';
        } else {
            none.style.display = 'none';
        }

        // حفظ حالة الزر في التخزين المحلي
        localStorage.setItem('buttonState', none.style.display);
    }
    _clearAllWorkouts() {
        // Remove all markers from the map
        this.#map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                layer.remove();
            }
        });

        // Remove all workout elements from the list
        const workoutElements = document.querySelectorAll('.workout');
        workoutElements.forEach(element => element.parentNode.removeChild(element));

        // Clear the workouts array
        this.#workouts = [];

        // Update local storage
        localStorage.removeItem('workouts');

        // Update button visibility
        this._checkWorkoutsAndToggleButton();
    }


    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

}

const app = new App();