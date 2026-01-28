import { useState, useMemo, useRef } from 'react';
import {
  Popover,
  Box,
  Typography,
  styled,
} from '@mui/material';
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
  // Internal date for calendar navigation (year/month selection)
  const [displayDate, setDisplayDate] = useState(() => dayjs(selectedDate));
  // Use ref to track view synchronously since onViewChange fires after onChange
  const viewRef = useRef('day');

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
    
    // Create a sorted copy to find min and max correctly regardless of input order
    const sortedDates = [...availableDates].sort();
    return {
      minDate: dayjs(sortedDates[0]),
      maxDate: dayjs(sortedDates[sortedDates.length - 1]),
    };
  }, [availableDates]);

  const handleClick = (event) => {
    setDisplayDate(dayjs(selectedDate));
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCalendarView('day');
    viewRef.current = 'day';
  };

  const handleViewChange = (newView) => {
    viewRef.current = newView;
    setCalendarView(newView);
  };

  const handleDateChange = (newDate) => {
    if (!newDate || !dayjs.isDayjs(newDate)) return;

    // Always update display date for navigation
    setDisplayDate(newDate);

    // Only commit selection when in day view (actual day click)
    // viewRef is used because onViewChange fires after onChange
    if (viewRef.current !== 'day') return;

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
      <Box
        onClick={handleClick}
        sx={{
          px: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          cursor: 'pointer',
          minWidth: 120,
          height: 40,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {selectedDate}
        </Typography>
      </Box>
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
              value={displayDate}
              onChange={handleDateChange}
              minDate={minDate}
              maxDate={maxDate}
              views={['year', 'month', 'day']}
              view={calendarView}
              onViewChange={handleViewChange}
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
