
//Async Handler =Promise wraper
//" jo async function hai usko promise mein wrap kar do, agar error aye to express ke next ko pass kar do  "

const asyncHandler = (requestHandler) => {
    return (req, res, next) => { //yeh Express.js ka standard middleware pattern hai 
        Promise.resolve(requestHandler(req, res, next))
            .catch((err) => next(err))
    }
}







export { asyncHandler }

// const asyncHandler=()=>{}
// const asyncHandler=(func)=>()={}
// const asyncHandler = (func) => async () => { }


// const asyncHandler = (fun) => async (req, res, next) => {
//         try {
//             await fun(req,res,next)
//         } catch (error) {
//             res.staus(error.code || 500).json({
//                 success: false,
//                 message:error.message
//             })
//         }
//     }

