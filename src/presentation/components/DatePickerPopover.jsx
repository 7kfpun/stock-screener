import { useState, useMemo } from 'react';
import {
  Popover,
  IconButton,
  Box,
  Typography,
  styled,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import { trackDateSelection } from '../../shared/analytics.js';

const StyledDay = styled(PickersDay, {
  shouldForwardProp: (prop) => prop !== 'isAvailable',
})(({ theme, isAvailable }) => ({
  ...(isAvailable && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 600,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.secondary.dark,
      },
    },
  }),
}));

function DatePickerPopover({ selectedDate, availableDates, onDateChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [calendarView, setCalendarView] = useState('day');

  const open = Boolean(anchorEl);

  const availableDatesSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  const { minDate, maxDate } = useMemo(() => {
    if (availableDates.length === 0) {
      return {
        minDate: dayjs().subtract(1, 'year'),
        maxDate: dayjs(),
      };
    }
    return {
      minDate: dayjs(availableDates[0]),
      maxDate: dayjs(availableDates[availableDates.length - 1]),
    };
  }, [availableDates]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCalendarView('day');
  };

  const handleDateChange = (newDate) => {
    if (!newDate || !dayjs.isDayjs(newDate)) return;

    const dateString = newDate.format('YYYY-MM-DD');
    if (availableDatesSet.has(dateString)) {
      onDateChange(dateString);
      trackDateSelection(dateString);
      handleClose();
    }
  };

  const CustomDay = (props) => {
    const { day, outsideCurrentMonth, ...other } = props;

    if (!day || !dayjs.isDayjs(day)) {
      return <PickersDay {...other} day={day} outsideCurrentMonth={outsideCurrentMonth} />;
    }

    const isAvailable = availableDatesSet.has(day.format('YYYY-MM-DD'));

    return (
      <StyledDay
        {...other}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        disabled={!isAvailable || outsideCurrentMonth}
        isAvailable={isAvailable}
      />
    );
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        color="primary"
        size="small"
        title="Select date from calendar"
        sx={{
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
        }}
      >
        <CalendarMonthIcon />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              boxShadow: 3,
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
            Select a date
          </Typography>
          <Typography variant="caption" sx={{ mb: 2, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
            Highlighted dates have available data
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              value={dayjs(selectedDate)}
              onChange={handleDateChange}
              minDate={minDate}
              maxDate={maxDate}
              views={['year', 'month', 'day']}
              view={calendarView}
              onViewChange={setCalendarView}
              openTo="day"
              slots={{ day: CustomDay }}
            />
          </LocalizationProvider>
        </Box>
      </Popover>
    </>
  );
}

export default DatePickerPopover;
