'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.button');
const none = document.querySelector('.none');
const coord = [33.51, 36.3]; // إحداثيات دمشق

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60); // km/h
        return this.speed;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoom = 13;

    constructor() {
        // تحميل الخريطة مباشرة بالإحداثيات الثابتة
        this._loadMap(coord);

        // تحميل البيانات المحفوظة
        this._getLocalStorage();

        // إضافة معالجي الأحداث
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPop.bind(this));
        deleteAll.addEventListener('click', this._clearAllWorkouts.bind(this));

        // التحقق من وجود تمارين لعرض زر الحذف
        this._checkWorkoutsAndToggleButton();
    }

    _loadMap(coords) {
        this.#map = L.map('map').setView(coords, this.#mapZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // عرض النموذج عند النقر على الخريطة
        this.#map.on('click', this._showForm.bind(this));

        // عرض العلامات للتمارين المحفوظة
        this.#workouts.forEach(w => this._renderWorkoutMarker(w));
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
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        // الحصول على البيانات من النموذج
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('Inputs have to be positive numbers!');

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInput(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('Inputs have to be positive numbers!');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // إضافة التمرين الجديد
        this.#workouts.push(workout);

        // عرض العلامة والتمرين
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);

        // إخفاء النموذج وحفظ البيانات
        this._hideForm();
        this._setLocal();
        this._checkWorkoutsAndToggleButton();
    }

    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(
                `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
            )
            .openPopup();

        marker.on('popupclose', () => this._deleteWorkout(marker, workout));
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if (workout.type === 'running') {
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
            `;
        }

        if (workout.type === 'cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            `;
        }

        html += `</li>`;
        form.insertAdjacentHTML('afterend', html);
    }

    _deleteWorkout(marker, workout) {
        const workoutElement = document.querySelector(`[data-id="${workout.id}"]`);
        if (workoutElement) workoutElement.remove();

        marker.remove();

        this.#workouts = this.#workouts.filter(w => w.id !== workout.id);
        this._setLocal();
        this._checkWorkoutsAndToggleButton();
    }

    _moveToPop(e) {
        if (!this.#map) return;

        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;

        const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
        if (!workout) return;

        this.#map.setView(workout.coords, this.#mapZoom, {
            animate: true,
            pan: { duration: 1 }
        });
    }

    _setLocal() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = localStorage.getItem('workouts');
        if (!data) return;

        this.#workouts = JSON.parse(data);
        this.#workouts.forEach(w => {
            // إعادة إنشاء الكائنات من الفئات المناسبة
            if (w.type === 'running') {
                Object.setPrototypeOf(w, Running.prototype);
            } else if (w.type === 'cycling') {
                Object.setPrototypeOf(w, Cycling.prototype);
            }

            this._renderWorkoutMarker(w);
            this._renderWorkout(w);
        });
    }

    _checkWorkoutsAndToggleButton() {
        none.style.display = this.#workouts.length > 0 ? 'block' : 'none';
        localStorage.setItem('buttonState', none.style.display);
    }

    _clearAllWorkouts() {
        // إزالة جميع العلامات
        this.#map.eachLayer(layer => {
            if (layer instanceof L.Marker) layer.remove();
        });

        // إزالة جميع عناصر التمارين
        document.querySelectorAll('.workout').forEach(el => el.remove());

        // مسح المصفوفة والتخزين المحلي
        this.#workouts = [];
        localStorage.removeItem('workouts');
        this._checkWorkoutsAndToggleButton();
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();