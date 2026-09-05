#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "my_papi.h"

// PAPI events to monitor
static int NUM_EVENTS=0;
static int *Events=NULL;
// PAPI counters' values
static long long *values=NULL;
// number of matrix elements
static int total_elements=1;

// PAPI counters are only read if the gemm() version is less than 8
// this is because we are not using them with OpenMP (multiple cores)
// to avoid misinterpretations of their values
// the following var controls the reading of PAPI counters
static int MYPAPI_readcounters=0;

// vars for time measurement
static long long start_usec, min_usec=-1;

int MYPAPI_init (const int version, const int p_total_elements, const int num_events, int *p_Events) {
  int num_hwcntrs;

  // PAPI counters are only read if the gemm() version is less than 8
  if (version >=8) {
    MYPAPI_readcounters=0;
    return 1;
  }
  MYPAPI_readcounters=1;

  total_elements = p_total_elements;

  // Initialize PAPI 
  PAPI_library_init (PAPI_VER_CURRENT);

  /* Get the number of hardware counters available */
  if ((num_hwcntrs = PAPI_num_counters()) <= PAPI_OK)  {
    fprintf (stderr, "PAPI error getting number of available hardware counters!\n");
    return 0;
  }
  else fprintf (stderr," PAPI has %d counters\n", num_hwcntrs);

  NUM_EVENTS = num_events;
  // We will be using at most NUM_EVENTS counters
  if (num_hwcntrs >= NUM_EVENTS) {
    num_hwcntrs = NUM_EVENTS;
  } else {
    fprintf (stderr, "Error: there aren't enough counters to monitor %d events!\n", NUM_EVENTS);
    return 0;
  }

  Events = (int *) malloc (NUM_EVENTS * sizeof(int));
  if (Events==NULL) { 
    fprintf (stderr, "Error: cannot alloc mem for %d events!\n", NUM_EVENTS);
    return 0;
  }
  values = (long long *) malloc (NUM_EVENTS * sizeof(long long));
  if (values==NULL) { 
    fprintf (stderr, "Error: cannot alloc mem for %d values!\n", NUM_EVENTS);
    return 0;
  }
  memcpy (Events, p_Events, NUM_EVENTS*sizeof(int));

  return (1);
}

int MYPAPI_start (int meas_loop) {

  int *Local_Events=NULL;
  int initial_event = 0;
  int num_events = 0;

  // select which and how many events giver meas_loop
  if (meas_loop==0) {  // first iteration: PAPI_TOT_INS and PAPI_TOT_CYC
    num_events=2;
    initial_event = 0;
  }
  else if (NUM_EVENTS>meas_loop+1) {
    num_events = 1;
    initial_event = meas_loop+1;
  }
  Local_Events = &(Events[initial_event]);

  // use PAPI timer (usecs) 
  start_usec = PAPI_get_real_usec();

  if (MYPAPI_readcounters) {
    /* Start counting events */
    int error_code = PAPI_start_counters(Local_Events, num_events);
    if (error_code != PAPI_OK) {
      fprintf (stderr, "PAPI error starting counters:");
      switch (error_code) {
        case PAPI_EINVAL: 
          fprintf (stderr, "PAPI_EINVAL: one or more of the arguments is invalid!\n");
          break;
        case PAPI_EISRUN: 
          fprintf (stderr, "PAPI_EISRUN: counters have already been started!\n");
          break;
        case PAPI_ESYS: 
          fprintf (stderr, "PAPI_ESYS: sustem call error!\n");
          break;
        case PAPI_ENOMEM: 
          fprintf (stderr, "PAPI_ENOMEM: not enough memory!\n");
          break;
        case PAPI_ECNFLCT: 
          fprintf (stderr, "PAPI_ECNFLCT: counters conflict!\n");
          break;
        case PAPI_ENOEVNT: 
          fprintf (stderr, "PAPI_ENOEVNT: counters not available!\n");
          break;
      }      
      return 0;
    }
  }
  return 1;
}

int MYPAPI_stop (int meas_loop) {
  long long end_usec, elapsed_usec;
  long long *Local_values=NULL;
  int initial_event = 0;
  int num_events = 0;

  // select which and how many events giver meas_loop
  if (meas_loop==0) {  // first iteration: PAPI_TOT_INS and PAPI_TOT_CYC
    num_events=2;
    initial_event = 0;
  }
  else if (NUM_EVENTS>meas_loop+1) {
    num_events = 1;
    initial_event = meas_loop+1;
  }
  Local_values = &(values[initial_event]);


  if (MYPAPI_readcounters) {
    /* Stop counting events */
    if (PAPI_stop_counters(Local_values, num_events) != PAPI_OK) {
      fprintf (stderr, "PAPI error stoping counters!\n");
      return 0;
    }
  }
  end_usec = PAPI_get_real_usec();

  elapsed_usec = end_usec - start_usec;

  if ((min_usec==-1) || (elapsed_usec < min_usec)) {
    min_usec = elapsed_usec;
  }
  return 1;
}

static void output_long_long (const long long out) {
  float num;
  int mag;
  char* str_mag[4]={" ", "K", "M", "G"};

  for (mag = 0, num=(float)out; mag <3 && num >= 1000. ; mag++, num/=1000.);
  fprintf (stdout, "%.1f %s", num, str_mag[mag]);
}
  

void MYPAPI_output (void) {
  int i;
  float TOT_CYC, TOT_INS, CPI;

  fprintf (stdout, "\n\nWall clock time: %.0lld msecs\n", min_usec/1000);
  
  // only use PAPI if using a single core
  if (MYPAPI_readcounters) {
    // output PAPI counters' values
    for (i=0 ; i< NUM_EVENTS ; i++) {
      char EventCodeStr[PAPI_MAX_STR_LEN];

      if (PAPI_event_code_to_name(Events[i], EventCodeStr) == PAPI_OK) {
	fprintf (stdout, "%s = ", EventCodeStr);
	output_long_long (values[i]);
        fprintf (stdout, "\n");
      } else {
	fprintf (stdout, "PAPI UNKNOWN EVENT = %lld\n", values[i]);
      }
    }

    // evaluate CPI here
    if ((Events[0] == PAPI_TOT_CYC) && (Events[1] == PAPI_TOT_INS)) {
	TOT_CYC = (float)values[0];
	TOT_INS = (float)values[1];
	// ... insert your code here
	//
        CPI = TOT_CYC / TOT_INS;
	fprintf (stdout, "CPI = %.2f\n", CPI);
    }
  }
}

