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

const StyledDay = styled(PickersDay)(({ theme, available }) => ({
  ...(available && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
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
  ...(!available && {
    opacity: 0.3,
    pointerEvents: 'none',
  }),
}));

function DatePickerPopover({ selectedDate, availableDates, onDateChange }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Convert available dates to a Set for faster lookup
  const availableDatesSet = useMemo(() => new Set(availableDates), [availableDates]);

  // Get the earliest and latest dates for calendar bounds
  const minDate = useMemo(() =>
    availableDates.length > 0 ? dayjs(availableDates[0]) : dayjs().subtract(1, 'year'),
    [availableDates]
  );
  const maxDate = useMemo(() =>
    availableDates.length > 0 ? dayjs(availableDates[availableDates.length - 1]) : dayjs(),
    [availableDates]
  );

  const handleDateChange = (newDate) => {
    if (newDate && dayjs.isDayjs(newDate)) {
      const dateString = newDate.format('YYYY-MM-DD');
      if (availableDatesSet.has(dateString)) {
        onDateChange(dateString);
        trackDateSelection(dateString);
        handleClose();
      }
    }
  };

  // Create a custom day component
  const CustomDay = (props) => {
    const { day, ...other } = props;
    if (!day || !dayjs.isDayjs(day)) {
      return <PickersDay {...other} day={day} />;
    }
    const dateString = day.format('YYYY-MM-DD');
    const isAvailable = availableDatesSet.has(dateString);

    return (
      <StyledDay
        {...other}
        day={day}
        available={isAvailable}
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
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{
          '& .MuiPopover-paper': {
            borderRadius: 2,
            boxShadow: 3,
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
              slots={{
                day: CustomDay,
              }}
              sx={{
                '& .MuiPickersCalendarHeader-root': {
                  paddingLeft: 1,
                  paddingRight: 1,
                  marginBottom: 1,
                },
                '& .MuiPickersCalendarHeader-label': {
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                },
                '& .MuiPickersArrowSwitcher-root': {
                  display: 'inline-flex',
                  '& button': {
                    padding: 1,
                  },
                },
                '& .MuiPickersArrowSwitcher-button': {
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                },
              }}
            />
          </LocalizationProvider>
        </Box>
      </Popover>
    </>
  );
}

export default DatePickerPopover;
