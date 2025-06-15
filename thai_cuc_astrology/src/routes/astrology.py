import calendar
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from lunardate import LunarDate

astrology_bp = Blueprint('astrology', __name__)

# Bát Quái (Eight Trigrams) definitions
BAT_QUAI = {
    1: {
        'name': 'Càn',
        'symbol': '☰',
        'element': 'Heaven',
        'energy': 7,
        'description':
        'Strong, creative, leadership, initiation, positive energy',
        'characteristics': ['Creative', 'Strong', 'Leadership', 'Initiative'],
        'color': '#FFD700'  # Gold
    },
    2: {
        'name': 'Đoài',
        'symbol': '☱',
        'element': 'Lake',
        'energy': 6,
        'description':
        'Joyous, open, communication, pleasure, social connections',
        'characteristics': ['Joyous', 'Open', 'Communication', 'Social'],
        'color': '#87CEEB'  # Sky Blue
    },
    3: {
        'name': 'Ly',
        'symbol': '☲',
        'element': 'Fire',
        'energy': 5,
        'description':
        'Bright, clear, passionate, illuminating, sudden changes',
        'characteristics': ['Bright', 'Passionate', 'Illuminating', 'Dynamic'],
        'color': '#FF4500'  # Orange Red
    },
    4: {
        'name': 'Chấn',
        'symbol': '☳',
        'element': 'Thunder',
        'energy': 4,
        'description': 'Arousing, inciting, movement, shock, awakening',
        'characteristics': ['Arousing', 'Movement', 'Awakening', 'Dynamic'],
        'color': '#9370DB'  # Medium Purple
    },
    5: {
        'name': 'Tốn',
        'symbol': '☴',
        'element': 'Wind',
        'energy': 3,
        'description': 'Gentle, penetrating, gradual progress, flexibility',
        'characteristics': ['Gentle', 'Flexible', 'Progressive', 'Adaptive'],
        'color': '#98FB98'  # Pale Green
    },
    6: {
        'name': 'Khảm',
        'symbol': '☵',
        'element': 'Water',
        'energy': 2,
        'description':
        'Deep, mysterious, challenging, flowing, emotional depth',
        'characteristics': ['Deep', 'Mysterious', 'Flowing', 'Emotional'],
        'color': '#4682B4'  # Steel Blue
    },
    7: {
        'name': 'Cấn',
        'symbol': '☶',
        'element': 'Mountain',
        'energy': 1,
        'description':
        'Keeping still, resting, meditation, stability, patience',
        'characteristics': ['Still', 'Stable', 'Patient', 'Meditative'],
        'color': '#8B4513'  # Saddle Brown
    },
    8: {
        'name': 'Khôn',
        'symbol': '☷',
        'element': 'Earth',
        'energy': 0,
        'description': 'Receptive, yielding, supportive, nurturing, stability',
        'characteristics': ['Receptive', 'Nurturing', 'Supportive', 'Stable'],
        'color': '#DAA520'  # Goldenrod
    }
}


def get_daily_trigram(day):
    """Calculate the daily trigram based on the day of the month"""
    return ((day - 1) % 8) + 1


def get_monthly_trigram(month):
    """Calculate the monthly trigram based on the month"""
    return ((month - 1) % 8) + 1


def is_leap_year(year):
    # Schaltjahrregel: Teilbar durch 4, aber nicht durch 100, außer durch 400
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def day_of_year(year, month, day):
    # Monatslängen je nach Schaltjahr
    days_in_month = [
        31, 29 if is_leap_year(year) else 28, 31, 30, 31, 30, 31, 31, 30, 31,
        30, 31
    ]
    return sum(days_in_month[:month - 1]) + day


# --------- Core I Ching Hexagram Calculations ---------


def calculate_hexagram_from_date(year, month, day):
    """
    1. Convert Gregorian date to Chinese lunar date (lunardate package).
    2. Use lunar month/day to derive upper and lower trigrams (0–7).
    3. Compose a 6-line hexagram index (0–63).
    4. Compute Yin/Yang line counts and a wave_value scaled to ±5, ±10.
    """
    # 1) Lunar conversion
    lunar = LunarDate.fromSolarDate(year, month, day)
    lm, ld = lunar.month, lunar.day

    # 2) Trigram cycles (0-7)
    upper_trigram = (lm - 1) % 8
    lower_trigram = (ld - 1) % 8

    # 3) Base hexagram number (0-63)
    base_number = (upper_trigram * 8 + lower_trigram) % 64

    # 4) Convert to 6-bit binary and reverse for bottom→top line order
    binary_str = format(base_number, '06b')
    hexagram_lines = [int(bit) for bit in binary_str[::-1]]

    # 5) Count Yang (1) and Yin (0)
    yang_lines = binary_str.count('1')
    yin_lines = 6 - yang_lines

    # 6) Wave value: (yang-yin)*2.5 yields exact ±5, ±10 for 2-line difference
    wave_value = (yang_lines - yin_lines) * 2.5

    return {
        'lunar_month': lm,
        'lunar_day': ld,
        'base_number': base_number,
        'binary_representation': binary_str,
        'hexagram_lines': hexagram_lines,
        'yang_lines': yang_lines,
        'yin_lines': yin_lines,
        'wave_value': wave_value
    }


def calculate_hexagram_from_datetime(year, month, day, hour):
    """
    Hourly hexagram variation:
    - Upper trigram from lunar month
    - Lower trigram shifts every 3 hours from lunar day
    """
    lunar = LunarDate.fromSolarDate(year, month, day)
    lm, ld = lunar.month, lunar.day

    upper_trigram = (lm - 1) % 8
    # Shift lower trigram each 3-hour block
    lower_trigram = ((ld - 1) + (hour // 3)) % 8

    base_number = (upper_trigram * 8 + lower_trigram) % 64
    binary_str = format(base_number, '06b')
    hexagram_lines = [int(bit) for bit in binary_str[::-1]]

    yang_lines = binary_str.count('1')
    yin_lines = 6 - yang_lines
    wave_value = (yang_lines - yin_lines) * 2.5

    return {
        'base_number': base_number,
        'binary_representation': binary_str,
        'hexagram_lines': hexagram_lines,
        'yang_lines': yang_lines,
        'yin_lines': yin_lines,
        'wave_value': wave_value
    }


def calculate_yin_yang_score(year, month, day):
    """
    Simple Yin/Yang heuristic:
    score = (day - month) + sum of year digits
    """
    year_digit_sum = sum(int(d) for d in str(year))
    return (day - month) + year_digit_sum


def get_yin_yang_interpretation(score):
    """Get interpretation of the Yin/Yang score"""
    if score > 5:
        return {
            'type': 'Dương mạnh',
            'description':
            'Năng lượng Dương rất mạnh, thích hợp cho các hoạt động tích cực, khởi nghiệp',
            'color': '#4CAF50',
            'strength': 'strong'
        }
    elif score > 0:
        return {
            'type': 'Dương vừa phải',
            'description':
            'Năng lượng Dương ổn định, cân bằng tốt cho công việc hàng ngày',
            'color': '#8BC34A',
            'strength': 'moderate'
        }
    elif score == 0:
        return {
            'type': 'Trung hòa',
            'description':
            'Âm Dương cân bằng hoàn hảo, thích hợp cho thiền định và suy ngẫm',
            'color': '#FFC107',
            'strength': 'balanced'
        }
    elif score > -5:
        return {
            'type': 'Âm vừa phải',
            'description':
            'Năng lượng Âm nhẹ nhàng, thích hợp cho nghỉ ngơi và phục hồi',
            'color': '#FF9800',
            'strength': 'moderate'
        }
    else:
        return {
            'type': 'Âm mạnh',
            'description':
            'Năng lượng Âm rất mạnh, nên tránh các quyết định quan trọng',
            'color': '#F44336',
            'strength': 'strong'
        }


def calculate_daily_energy(daily_trigram_id, monthly_trigram_id):
    """Calculate the daily energy score based on trigram interaction"""
    daily_energy = BAT_QUAI[daily_trigram_id]['energy']
    monthly_energy = BAT_QUAI[monthly_trigram_id]['energy']

    # Calculate interaction bonus based on trigram compatibility
    interaction_bonus = 0

    # Same elements strengthen each other
    if BAT_QUAI[daily_trigram_id]['element'] == BAT_QUAI[monthly_trigram_id][
            'element']:
        interaction_bonus = 2

    # Opposing elements weaken each other (Fire-Water, Heaven-Earth, etc)
    opposing_pairs = [{'Fire', 'Water'}, {'Heaven', 'Earth'},
                      {'Thunder', 'Mountain'}, {'Wind', 'Lake'}]
    daily_element = BAT_QUAI[daily_trigram_id]['element']
    monthly_element = BAT_QUAI[monthly_trigram_id]['element']

    for pair in opposing_pairs:
        if daily_element in pair and monthly_element in pair:
            interaction_bonus = -2
            break

    # Calculate final energy
    final_energy = daily_energy + (monthly_energy * 0.5) + interaction_bonus

    # Normalize to -10 to +10 range
    return max(-10, min(10, final_energy))


def generate_event_probabilities(trigram_id):
    """Generate event probabilities based on trigram characteristics"""
    trigram = BAT_QUAI[trigram_id]
    base_energy = trigram['energy']

    # Define event categories and their base probabilities
    events = {
        'financial': max(0, min(100, 50 + base_energy * 5)),
        'relationship': max(0, min(100, 60 + base_energy * 3)),
        'health': max(0, min(100, 70 + base_energy * 2)),
        'career': max(0, min(100, 55 + base_energy * 4)),
        'creativity': max(0, min(100, 45 + base_energy * 6))
    }

    return events


@astrology_bp.route('/daily/<int:year>/<int:month>/<int:day>')
def get_daily_astrology(year, month, day):
    """Get astrology data for a specific day, including hourly wave values"""
    try:
        # Validate date
        datetime(year, month, day)

        daily_trigram_id = get_daily_trigram(day)
        monthly_trigram_id = get_monthly_trigram(month)

        daily_trigram = BAT_QUAI[daily_trigram_id]
        monthly_trigram = BAT_QUAI[monthly_trigram_id]

        daily_energy = calculate_daily_energy(daily_trigram_id,
                                              monthly_trigram_id)
        event_probabilities = generate_event_probabilities(daily_trigram_id)

        # Calculate Yin/Yang score
        yin_yang_score = calculate_yin_yang_score(year, month, day)
        yin_yang_interpretation = get_yin_yang_interpretation(yin_yang_score)

        # Calculate hourly hexagram-based wave values for the day
        hourly_wave_data = []
        for hour in range(24):
            hexagram_data_hourly = calculate_hexagram_from_datetime(
                year, month, day, hour)
            hourly_wave_data.append({
                'hour':
                hour,
                'wave_value':
                hexagram_data_hourly['wave_value'],
                'binary_representation':
                hexagram_data_hourly['binary_representation']
            })

        # Calculate hexagram-based wave value for the day (using midnight for consistency)
        hexagram_data_daily = calculate_hexagram_from_date(year, month, day)

        return jsonify({
            'date':
            f'{year}-{month:02d}-{day:02d}',
            'daily_trigram':
            daily_trigram,
            'monthly_trigram':
            monthly_trigram,
            'daily_energy':
            daily_energy,
            'event_probabilities':
            event_probabilities,
            'yin_yang_score':
            yin_yang_score,
            'yin_yang_interpretation':
            yin_yang_interpretation,
            'hexagram':
            hexagram_data_daily,
            'wave_value':
            hexagram_data_daily['wave_value'],
            'hourly_wave_data':
            hourly_wave_data,
            'interpretation':
            f"Today is influenced by {daily_trigram['name']} ({daily_trigram['symbol']}), representing {daily_trigram['element']}. {daily_trigram['description']}. The monthly influence of {monthly_trigram['name']} adds additional depth to today's energy. Yin/Yang energy: {yin_yang_interpretation['type']}."
        })

    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400


@astrology_bp.route('/monthly/<int:year>/<int:month>')
def get_monthly_astrology(year, month):
    """Get astrology data for an entire month"""
    try:
        # Validate month
        if month < 1 or month > 12:
            raise ValueError("Invalid month")

        monthly_trigram_id = get_monthly_trigram(month)
        monthly_trigram = BAT_QUAI[monthly_trigram_id]

        # Get number of days in the month
        days_in_month = calendar.monthrange(year, month)[1]

        daily_energies = [
        ]  # Renamed from daily_data for frontend compatibility
        for day in range(1, days_in_month + 1):
            daily_trigram_id = get_daily_trigram(day)
            daily_trigram = BAT_QUAI[daily_trigram_id]
            daily_energy = calculate_daily_energy(daily_trigram_id,
                                                  monthly_trigram_id)

            # Calculate Yin/Yang score and wave value for each day
            yin_yang_score = calculate_yin_yang_score(year, month, day)
            yin_yang_interpretation = get_yin_yang_interpretation(
                yin_yang_score)
            hexagram_data = calculate_hexagram_from_date(year, month, day)

            daily_energies.append(
                {  # Updated structure for frontend compatibility
                    'day': day,
                    'trigram': daily_trigram,
                    'energy': daily_energy,
                    'yin_yang_score': yin_yang_score,
                    'yin_yang_interpretation': yin_yang_interpretation,
                    'hexagram': hexagram_data,
                    'wave_value': hexagram_data['wave_value']
                })

        return jsonify({
            'year':
            year,
            'month':
            month,
            'monthly_trigram':
            monthly_trigram,
            'daily_energies':
            daily_energies,  # Changed from daily_data to daily_energies
            'summary':
            f"This month is governed by {monthly_trigram['name']} ({monthly_trigram['symbol']}), representing {monthly_trigram['element']}. {monthly_trigram['description']}"
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@astrology_bp.route('/trigrams')
def get_all_trigrams():
    """Get information about all eight trigrams"""
    return jsonify(BAT_QUAI)
